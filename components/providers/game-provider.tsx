"use client"

/**
 * 游戏全局状态 —— 完全接入 BSC 主网真实合约。
 *
 * 数据流：
 *   1. 钱包通过 EIP-1193 注入 → publicClient 读链 + walletClient 写交易
 *   2. 用户连接后立即拉取静态参数 + 用户全状态（multicall），随后 8 秒轮询
 *   3. 角色 NFT 列表通过 Transfer event diff 重建（仅在 connect / 交易后扫描）
 *   4. 写入交易：先 ensureAllowance，再 writeContract，等待回执，最后 refresh
 *
 * 召唤 / 合成是 commit-reveal 双阶段：
 *   - summon(count) 实际只调 requestDraw，需玩家在 RNG_DELAY_BLOCKS 之后再调 finalizeDraw
 *   - synthesize 同理
 */

import * as React from "react"
import { toast } from "sonner"
import { type Address, isAddress, zeroAddress } from "viem"

import {
  BSC_CHAIN_ID_HEX,
  ensureBscNetwork,
  getCurrentChainIdHex,
  getInjectedProvider,
  getWalletKind,
  requestAccounts,
  shortenAddress,
} from "@/lib/wallet"
import {
  CLASS_NAMES,
  DUNGEONS,
  MATERIAL_KEYS,
  RARITIES,
  RARITY_BY_LEVEL,
  SUMMON_TIER_SIZE,
  SYNTHESIS_COSTS,
  type MaterialKey,
  type RarityLevel,
} from "@/lib/game-data"
import { getPublicClient, getWalletClient } from "@/lib/web3/client"
import {
  CHAIN_ID as BSC_CHAIN_ID,
  MATERIAL_IDS,
  MATERIAL_UNIT,
  explorer,
} from "@/lib/web3/contracts"
import { bigintToNumber, parseToken, tokenToNumber } from "@/lib/web3/format"
import {
  buildCommit,
  clearSalt,
  makeSalt,
  persistSalt,
  readSalt,
} from "@/lib/web3/salt"

/** UI 视角的"1 个材料"对应链上 0.1 单位的整数倍 — Number 形式便于 UI 计算 */
const MATERIAL_UNIT_NUM = Number(MATERIAL_UNIT)
import {
  MARKET_ACTIVE_ORDER_LIMIT,
  readGameStatic,
  readMarketOrder,
  readMarketOrderPage,
  readOwnedCharacters,
  readUserState,
  getOrderPageScanBudget,
  type ChainCharacter,
  type ChainOrder,
  type GameStatic,
  type UserState,
} from "@/lib/web3/reads"
import {
  txApproveAdventForGame,
  txApproveMaterialsForMarketplace,
  txApproveUsdtForMarketplace,
  txApproveUsdtForStamina,
  txBindReferrer,
  txBuyOrder,
  txBuyStamina,
  txCancelDraw,
  txCancelOrder,
  txCancelSynthesize,
  txChallenge,
  type ChallengeResult,
  txClaimNewbieGift,
  txCreateOrder,
  txCreateTeam,
  txFinalizeDraw,
  txFinalizeSynthesize,
  txRequestDraw,
  txRequestSynthesize,
} from "@/lib/web3/writes"
export type { ChallengeResult } from "@/lib/web3/writes"

// ─── UI 数据形状 ─────────────────────────────────────────────────

export interface Character {
  /** 角色 NFT tokenId（字符串化） */
  id: string
  rarity: RarityLevel
  power: number
  /** UI 视觉用：基于 tokenId 稳定推断的职业索引（0..5） */
  classIndex: number
  /** 排序用 — 直接用 tokenId 数值 */
  bornAt: number
}

export interface Team {
  /** 队伍索引（链上是 array index） */
  id: string
  name: string
  characterIds: [string, string, string]
  /** 冷却结束时间戳（毫秒） */
  cooldownUntil: number
}

export interface MarketListing {
  /** 链上 orderId（字符串化） */
  id: string
  seller: string
  material: MaterialKey
  amount: number
  pricePerUnit: number
  createdAt: number
  isMine: boolean
}

export type Inventory = Record<MaterialKey, number>

interface SummonResult {
  ok: boolean
  /** 提交成功后链上结果未知（commit-reveal），newCharacters 为空 */
  newCharacters?: Character[]
  reason?: string
}

interface PendingDrawState {
  count: number
  /** 可被 finalize 的最早区块 */
  readyAtBlock: bigint
  /** 当前已经过了 ready 阈值 */
  ready: boolean
  /** 已过期需 cancel */
  expired: boolean
}
interface PendingSynthState {
  targetLevel: RarityLevel
  readyAtBlock: bigint
  ready: boolean
  expired: boolean
}

interface GameContextValue {
  // 钱包
  connected: boolean
  address: string | undefined
  shortAddress: string | undefined
  chainId: number | undefined
  walletKind: string | undefined
  /** 始终为 true（已彻底接入链上）— 旧字段保留兼容性 */
  isRealWallet: boolean
  isWrongChain: boolean
  connect: () => Promise<void>
  disconnect: () => void

  // 余额（UI 数字 — 已从 18 位 BigInt 转换）
  advent: number
  usdt: number
  energy: number
  inventory: Inventory

  // 角色 / 队伍
  characters: Character[]
  teams: Team[]

  // 全服 / 召唤价格
  globalSummoned: number
  charCap: number
  currentSummonCost: number

  // 推荐
  /** 已绑定的直接推荐人地址（字符串）；未绑定为 undefined */
  referrer: string | undefined
  /** 含 default fallback 的有效直接推荐人 */
  effectiveDirect: string | undefined
  /** 二级推荐人 */
  effectiveIndirect: string | undefined
  /** 旧字段：本地标识符 — 现在直接返回玩家地址作为"邀请链接 token" */
  myReferralCode: string

  // 市场
  listings: MarketListing[]
  /** 材料筛选同步到链上拉取逻辑：`ALL` = materialId 0 */
  setMarketMaterialFilter: (filter: MaterialKey | "ALL") => void
  /** 「全部」模式下：当前已缓存列表覆盖了多少条链上匹配（用于客户端分页） */
  marketLoadedMatchCount: number
  /** 是否还可能存在更多挂单（链上 cursor 未到尽头） */
  marketHasMore: boolean
  /** 为当前筛选预取下一段列表窗口（桌面/移动端分页「下一页」调用） */
  ensureMarketWindow: (neededMatches: number) => Promise<void>

  // 新手礼包
  newPlayerGiftClaimed: boolean

  // commit-reveal 状态
  pendingDraw: PendingDrawState | null
  pendingSynthesis: PendingSynthState | null
  currentBlock: bigint
  rngDelayBlocks: bigint
  rngExpiryBlocks: bigint

  // ADVENT → Game 授权（用于 UI 展示"授权 → 召唤"两步流程）
  /** 当前授权额度（链上 18 位 BigInt） */
  adventAllowanceForGame: bigint
  /** 是否已对 Game 进行充足授权（足以覆盖一次 ×10 召唤的 1.5x buffer） */
  isAdventApproved: boolean
  /** 主动授权 — 弹一次签名把 ADVENT 授权给 Game（max uint256） */
  approveAdvent: () => Promise<boolean>

  // USDT → Stamina 授权（用于 UI 展示"授权 → 购买体力"两步流程）
  usdtAllowanceForStamina: bigint
  /** 是否已对 Stamina 进行充足授权（≥ 100 点体力的预估 USDT） */
  isUsdtApprovedForStamina: boolean
  /** 主动授权 — 弹一次签名把 USDT 授权给 Stamina（max uint256） */
  approveUsdtForStamina: () => Promise<boolean>

  // USDT → Marketplace 授权（用于 UI 展示"授权 → 内盘买单"两步流程）
  /** 当前对 Marketplace 的 USDT 授权额度，BuyDialog 按本次买单总价比对决定是否需要授权 */
  usdtAllowanceForMarketplace: bigint
  /** 主动授权 — 弹一次签名把 USDT 授权给 Marketplace（max uint256） */
  approveUsdtForMarketplace: () => Promise<boolean>

  // Materials → Marketplace 授权（用于 UI 展示"授权 → 挂单"两步流程）
  /** ERC1155 所有材料对 Marketplace 的全局授权状态 */
  isMaterialsApprovedForMarketplace: boolean
  /** 主动授权 — 弹一次签名 setApprovalForAll(Marketplace, true) */
  approveMaterialsForMarketplace: () => Promise<boolean>

  // 加载状态
  isLoading: boolean
  isTxPending: boolean
  refresh: () => Promise<void>

  // ─── Actions（全部走真实链） ─────────────────────────────────
  claimNewPlayerGift: () => Promise<boolean>
  buyEnergy: (count: number) => Promise<boolean>
  bindReferrer: (referrerAddress: string) => Promise<boolean>

  /** 旧 API：等价于 requestDraw —— 提交召唤请求，结果需 finalize 才知道 */
  summon: (count: number) => Promise<SummonResult>
  finalizeDraw: () => Promise<boolean>
  cancelDraw: () => Promise<boolean>

  /** 旧 API：等价于 requestSynthesize */
  synthesize: (level: RarityLevel) => Promise<boolean>
  finalizeSynthesize: () => Promise<boolean>
  cancelSynthesize: () => Promise<boolean>

  createTeam: (ids: [string, string, string], name?: string) => Promise<boolean>
  /** 链上不支持解散队伍 — 仅给提示 */
  disbandTeam: (teamId: string) => void
  challenge: (
    teamId: string,
    dungeonLevel: number,
  ) => Promise<{ ok: boolean; result: ChallengeResult | null }>

  listMaterial: (
    material: MaterialKey,
    amount: number,
    pricePerUnit: number,
  ) => Promise<boolean>
  cancelListing: (id: string) => Promise<boolean>
  buyListing: (id: string, amount: number) => Promise<boolean>
}

const GameContext = React.createContext<GameContextValue | null>(null)

const initialInventory: Inventory = { AE: 0, BF: 0, MR: 0, ES: 0 }

function chainCharToUi(c: ChainCharacter): Character {
  // tokenId 很大时取尾部用作 hash
  const seed = Number(c.tokenId % 1000n)
  return {
    id: c.tokenId.toString(),
    rarity: c.level as RarityLevel,
    power: c.power,
    classIndex: seed % CLASS_NAMES.length,
    bornAt: Number(c.tokenId & 0xffffffffn),
  }
}

function chainOrderToUi(o: ChainOrder, me: Address | undefined): MarketListing | null {
  // 反查 materialId → MaterialKey
  let material: MaterialKey | null = null
  for (const k of MATERIAL_KEYS) {
    if (MATERIAL_IDS[k] === o.materialId) {
      material = k
      break
    }
  }
  if (!material) return null
  const isMine = me ? o.seller.toLowerCase() === me.toLowerCase() : false
  return {
    id: o.orderId.toString(),
    seller: shortenAddress(o.seller),
    material,
    // 链上 remaining 是 0.1 单位；UI 显示为"个"
    amount: Number(o.remaining) / MATERIAL_UNIT_NUM,
    // pricePerUnit 是"链上每 0.1 单位的 USDT 价" — UI 想展示"每 1 个的价"需 ×10
    pricePerUnit: tokenToNumber(o.pricePerUnit) * MATERIAL_UNIT_NUM,
    createdAt: Date.now(),
    isMine,
  }
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000

function chainTeamToUi(
  t: { characterIds: [bigint, bigint, bigint]; lastChallengeAt: bigint },
  index: number,
  cooldownSeconds: bigint,
): Team {
  const lastMs = Number(t.lastChallengeAt) * 1000
  const cooldownMs = Number(cooldownSeconds) * 1000 || COOLDOWN_MS
  const cooldownUntil = lastMs > 0 ? lastMs + cooldownMs : 0
  return {
    id: index.toString(),
    name: `深渊小队 #${index + 1}`,
    characterIds: [
      t.characterIds[0].toString(),
      t.characterIds[1].toString(),
      t.characterIds[2].toString(),
    ],
    cooldownUntil,
  }
}

function mergeChainOrdersDesc(prev: ChainOrder[], add: ChainOrder[]): ChainOrder[] {
  if (add.length === 0) return prev
  const map = new Map<string, ChainOrder>()
  for (const o of prev) map.set(o.orderId.toString(), o)
  for (const o of add) map.set(o.orderId.toString(), o)
  return [...map.values()].sort((a, b) => (a.orderId < b.orderId ? 1 : a.orderId > b.orderId ? -1 : 0))
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // 钱包
  const [connected, setConnected] = React.useState(false)
  const [address, setAddress] = React.useState<Address | undefined>(undefined)
  const [chainId, setChainId] = React.useState<number | undefined>(undefined)
  const [walletKind, setWalletKind] = React.useState<string | undefined>(undefined)

  // 链上数据
  const [staticData, setStaticData] = React.useState<GameStatic | null>(null)
  const [userState, setUserState] = React.useState<UserState | null>(null)
  const [chainCharacters, setChainCharacters] = React.useState<ChainCharacter[]>([])
  const [chainOrders, setChainOrders] = React.useState<ChainOrder[]>([])
  const [marketMaterialFilter, setMarketMaterialFilterState] = React.useState<MaterialKey | "ALL">(
    "ALL",
  )
  const [marketNextCursor, setMarketNextCursor] = React.useState<bigint>(0n)
  const [marketHasMore, setMarketHasMore] = React.useState(false)
  const [marketLoadedMatchCount, setMarketLoadedMatchCount] = React.useState(0)
  const marketFetchSeq = React.useRef(0)
  /** 市场「翻页预取」串行队列 —— 避免短时间内重叠触发多次 RPC + 连续 setState */
  const marketEnsureChainRef = React.useRef(Promise.resolve())
  const marketNextCursorRef = React.useRef<bigint>(0n)
  const marketHasMoreRef = React.useRef(false)
  const marketLoadedMatchCountRef = React.useRef(0)
  /**
   * 合约 `getOrderPage`：`cursor === 0` 表示从最新 orderId 起扫；续页用上一笔的 `nextCursor`。
   * 市页面挂载会 `setMarketMaterialFilter` 把 cursor 清为 `0n`，若把「首屏 0」误判为无后续，
   * 则 `ensureMarketWindow` 永远不会发请求。仅在一次成功读链之后，才把 `cursor === 0` 视为链尾。
   */
  const marketOrderPagingStartedRef = React.useRef(false)
  /** 与 `marketMaterialFilter` 同步，用于跳过「同值重复 set」导致的不必要清空（如市页面 mount） */
  const marketFilterCommitRef = React.useRef<MaterialKey | "ALL">("ALL")

  /** 页面在后台时暂停轮询，减轻低配 Windows 上 Dev Server + 浏览器双重内存压力 */
  const [docVisible, setDocVisible] = React.useState(true)
  React.useEffect(() => {
    if (typeof document === "undefined") return
    const sync = () => setDocVisible(!document.hidden)
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  React.useEffect(() => {
    marketNextCursorRef.current = marketNextCursor
  }, [marketNextCursor])
  React.useEffect(() => {
    marketHasMoreRef.current = marketHasMore
  }, [marketHasMore])
  React.useEffect(() => {
    marketLoadedMatchCountRef.current = marketLoadedMatchCount
  }, [marketLoadedMatchCount])
  /**
   * 独立维护的"实时区块号"。
   *
   * 主 multicall 30s 才跑一次，做副本 / 召唤 commit-reveal 倒计时太慢，
   * 因此当存在 pending request 时单独以 3s 频率拉 `getBlockNumber()`，
   * 让 UI 上"剩余 X 区块 / 进度条"能流畅推进。无 pending 时复用 multicall 里的 blockNumber。
   */
  const [liveBlock, setLiveBlock] = React.useState<bigint>(0n)

  const [isLoading, setIsLoading] = React.useState(false)
  const [isTxPending, setIsTxPending] = React.useState(false)

  const isWrongChain = chainId !== undefined && chainId !== BSC_CHAIN_ID

  const marketMaterialId = React.useMemo(
    () => (marketMaterialFilter === "ALL" ? 0n : MATERIAL_IDS[marketMaterialFilter]),
    [marketMaterialFilter],
  )

  const setMarketMaterialFilter = React.useCallback((filter: MaterialKey | "ALL") => {
    if (marketFilterCommitRef.current === filter) return
    marketFilterCommitRef.current = filter
    setMarketMaterialFilterState(filter)
    setMarketNextCursor(0n)
    marketNextCursorRef.current = 0n
    setMarketHasMore(false)
    marketHasMoreRef.current = false
    setMarketLoadedMatchCount(0)
    marketLoadedMatchCountRef.current = 0
    setChainOrders([])
    marketEnsureChainRef.current = Promise.resolve()
    marketFetchSeq.current += 1
    marketOrderPagingStartedRef.current = false
  }, [])

  // ─── 数据刷新 ───────────────────────────────────────────────

  const refreshUser = React.useCallback(async (addr: Address) => {
    try {
      const state = await readUserState(addr)
      setUserState(state)
    } catch (err) {
      console.error("[GameProvider] readUserState failed:", err)
    }
  }, [])

  const refreshOrders = React.useCallback(async () => {
    const seq = ++marketFetchSeq.current
    try {
      const budget = getOrderPageScanBudget(MARKET_ACTIVE_ORDER_LIMIT)
      const { nextCursor, orders } = await readMarketOrderPage(
        0n,
        MARKET_ACTIVE_ORDER_LIMIT,
        marketMaterialId,
        budget,
      )
      if (seq !== marketFetchSeq.current) return

      marketOrderPagingStartedRef.current = true
      setChainOrders(orders)
      setMarketNextCursor(nextCursor)
      marketNextCursorRef.current = nextCursor
      setMarketLoadedMatchCount(orders.length)
      marketLoadedMatchCountRef.current = orders.length

      const more = nextCursor > 0n
      setMarketHasMore(more)
      marketHasMoreRef.current = more
    } catch (err) {
      console.error("[GameProvider] readMarketOrderPage failed:", err)
    }
  }, [marketMaterialId])

  const ensureMarketWindow = React.useCallback(
    async (neededMatches: number) => {
      const need = Math.floor(neededMatches)
      if (!Number.isFinite(need) || need <= 0) return

      const run = async () => {
        const seq = marketFetchSeq.current
        try {
          while (marketLoadedMatchCountRef.current < need) {
            const loaded = marketLoadedMatchCountRef.current
            const cursor = marketNextCursorRef.current

            if (marketOrderPagingStartedRef.current && cursor === 0n) break

            /** 首轮尚未读链：必须用 `0n`（从最新挂单起）；已与链同步后用 `cursor` 续扫 */
            const rpcCursor = marketOrderPagingStartedRef.current ? cursor : 0n

            const remaining = need - loaded
            const budget = getOrderPageScanBudget(remaining)
            const { nextCursor, orders } = await readMarketOrderPage(
              rpcCursor,
              remaining,
              marketMaterialId,
              budget,
            )
            if (seq !== marketFetchSeq.current) return

            marketOrderPagingStartedRef.current = true

            setChainOrders((prev) => mergeChainOrdersDesc(prev, orders))

            const nextLoaded = loaded + orders.length
            setMarketLoadedMatchCount(nextLoaded)
            marketLoadedMatchCountRef.current = nextLoaded

            setMarketNextCursor(nextCursor)
            marketNextCursorRef.current = nextCursor

            const more = nextCursor > 0n
            setMarketHasMore(more)
            marketHasMoreRef.current = more
          }
        } catch (err) {
          console.error("[GameProvider] ensureMarketWindow failed:", err)
        }
      }

      marketEnsureChainRef.current = marketEnsureChainRef.current.catch(() => {}).then(run)
      await marketEnsureChainRef.current
    },
    [marketMaterialId],
  )

  const refreshCharacters = React.useCallback(async (addr: Address) => {
    try {
      const chars = await readOwnedCharacters(addr)
      setChainCharacters(chars)
    } catch (err) {
      console.error("[GameProvider] readOwnedCharacters failed:", err)
    }
  }, [])

  const refreshStatic = React.useCallback(async () => {
    try {
      const s = await readGameStatic()
      setStaticData(s)
    } catch (err) {
      console.error("[GameProvider] readGameStatic failed:", err)
    }
  }, [])

  const refresh = React.useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    await Promise.all([refreshUser(address), refreshOrders(), refreshCharacters(address)])
    setIsLoading(false)
  }, [address, refreshUser, refreshOrders, refreshCharacters])

  // 启动：拉静态 + 用户状态 + 订单 + 角色
  React.useEffect(() => {
    refreshStatic()
  }, [refreshStatic])

  // 落地解析 ?ref=<address> — 写入 localStorage，让推荐页 prefill 输入框；
  // 任何页面都生效（用户可能从首页 / 召唤页 / 任意分享链接进入）。
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const ref = new URLSearchParams(window.location.search).get("ref")
    if (!ref) return
    if (!isAddress(ref)) return
    try {
      window.localStorage.setItem("rune-pending-ref", ref.toLowerCase())
    } catch {
      // localStorage 被禁用 / 隐私模式，静默忽略
    }
  }, [])

  React.useEffect(() => {
    if (!address) {
      setUserState(null)
      setChainCharacters([])
      setChainOrders([])
      setMarketNextCursor(0n)
      marketNextCursorRef.current = 0n
      setMarketHasMore(false)
      marketHasMoreRef.current = false
      setMarketLoadedMatchCount(0)
      marketLoadedMatchCountRef.current = 0
      marketEnsureChainRef.current = Promise.resolve()
      marketFetchSeq.current += 1
      marketOrderPagingStartedRef.current = false
      marketFilterCommitRef.current = "ALL"
      return
    }
    setIsLoading(true)
    Promise.all([refreshUser(address), refreshCharacters(address), refreshOrders()]).finally(() =>
      setIsLoading(false),
    )
  }, [address, refreshUser, refreshCharacters, refreshOrders])

  // 30 秒轮询用户状态 + 订单（链上读取节流：避免免费 RPC 限流；
  // 角色列表不轮询 — 仅在 finalize / 转账后主动 refreshCharacters）
  React.useEffect(() => {
    if (!address || !docVisible) return
    const id = setInterval(() => {
      refreshUser(address)
      refreshOrders()
    }, 30_000)
    return () => clearInterval(id)
  }, [address, docVisible, refreshUser, refreshOrders])

  // 当存在 pending commit-reveal 请求时，3s 频率拉一次区块号 — 让 UI 倒计时实时推进。
  // 没有 pending 时不工作，避免常态高频请求 RPC。
  const hasPending = !!(
    userState?.pendingDraw.exists || userState?.pendingSynthesis.exists
  )
  React.useEffect(() => {
    if (!hasPending || !docVisible) return
    let cancelled = false
    const tick = async () => {
      try {
        const bn = await getPublicClient().getBlockNumber()
        if (!cancelled) setLiveBlock(bn)
      } catch (err) {
        console.error("[GameProvider] live blockNumber failed:", err)
      }
    }
    tick()
    const id = setInterval(tick, 3_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [hasPending, docVisible])

  // 当 pending 转为 ready（liveBlock 越过 readyAt）时，主动刷新一次完整 user state，
  // 让 finalize 按钮启用 — 否则要等到下一个 30s 轮询周期。
  React.useEffect(() => {
    if (!address || !userState || !staticData) return
    const p = userState.pendingDraw.exists
      ? userState.pendingDraw
      : userState.pendingSynthesis.exists
        ? userState.pendingSynthesis
        : null
    if (!p) return
    const readyAt = p.requestBlock + staticData.rngDelayBlocks
    // 已经 ready 但 userState.blockNumber 还落后 → 触发一次 refresh 同步真实状态
    if (liveBlock >= readyAt && userState.blockNumber < readyAt) {
      refreshUser(address)
    }
  }, [liveBlock, address, userState, staticData, refreshUser])

  // ─── 钱包连接 ───────────────────────────────────────────────

  const connect = React.useCallback(async () => {
    const provider = getInjectedProvider()
    if (!provider) {
      toast.error("未检测到钱包", {
        description: "请先安装 MetaMask / OKX / TokenPocket 等 BSC 兼容钱包",
      })
      return
    }
    try {
      const accounts = await requestAccounts(provider)
      const realAddr = accounts[0] as Address | undefined
      if (!realAddr) {
        toast.error("未授权账户", { description: "请在钱包弹窗中确认连接" })
        return
      }
      try {
        await ensureBscNetwork(provider)
      } catch (err) {
        const code = (err as { code?: number })?.code
        if (code === 4001) {
          toast.error("已取消切换网络", {
            description: "需要 BSC (chainId 56) 才能继续",
          })
          return
        }
        toast.warning("网络切换失败", { description: "可在钱包内手动切换至 BSC" })
      }
      const chainHex = await getCurrentChainIdHex(provider)
      setConnected(true)
      setAddress(realAddr)
      setChainId(parseInt(chainHex, 16))
      setWalletKind(getWalletKind(provider))
      toast.success("钱包已连接", {
        description: `${getWalletKind(provider)} · ${shortenAddress(realAddr)}`,
      })
    } catch (err) {
      const code = (err as { code?: number })?.code
      if (code === 4001) toast.error("已拒绝连接钱包")
      else
        toast.error("连接失败", {
          description: (err as Error)?.message ?? "请重试或手动选择网络",
        })
    }
  }, [])

  const disconnect = React.useCallback(() => {
    setConnected(false)
    setAddress(undefined)
    setChainId(undefined)
    setWalletKind(undefined)
    setUserState(null)
    setChainCharacters([])
    toast.info("已断开钱包")
  }, [])

  // 监听钱包账户/网络切换
  React.useEffect(() => {
    const provider = getInjectedProvider()
    if (!provider || !provider.on) return

    const handleAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? []
      if (accounts.length === 0) {
        setConnected(false)
        setAddress(undefined)
        setChainId(undefined)
        setUserState(null)
        setChainCharacters([])
        toast.info("钱包已断开")
      } else {
        setAddress(accounts[0] as Address)
        toast.info("账户已切换", { description: shortenAddress(accounts[0]) })
      }
    }
    const handleChain = (...args: unknown[]) => {
      const newChain = args[0] as string
      const id = parseInt(newChain, 16)
      setChainId(id)
      if (newChain.toLowerCase() !== BSC_CHAIN_ID_HEX) {
        toast.warning("已离开 BSC 网络", {
          description: "请切回 chainId 56 才能继续交易",
        })
      }
    }

    provider.on("accountsChanged", handleAccounts)
    provider.on("chainChanged", handleChain)
    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts)
      provider.removeListener?.("chainChanged", handleChain)
    }
  }, [])

  // 静默恢复连接
  React.useEffect(() => {
    const provider = getInjectedProvider()
    if (!provider) return
    let cancelled = false
    ;(async () => {
      try {
        const accounts = await provider.request<string[]>({ method: "eth_accounts" })
        if (cancelled || !accounts || !accounts[0]) return
        const chainHex = await getCurrentChainIdHex(provider)
        if (cancelled) return
        setConnected(true)
        setAddress(accounts[0] as Address)
        setChainId(parseInt(chainHex, 16))
        setWalletKind(getWalletKind(provider))
      } catch {
        /* noop */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ─── 交易封装 ───────────────────────────────────────────────

  const requireConnected = React.useCallback((): Address | null => {
    if (!connected || !address) {
      toast.error("请先连接钱包", { description: "点击右上角 LOGO 连接 BSC 钱包" })
      return null
    }
    if (isWrongChain) {
      toast.error("请切换到 BSC 主网", { description: "chainId 必须是 56" })
      return null
    }
    return address
  }, [connected, address, isWrongChain])

  /** 包装写交易：处理 toast + refresh + 错误转译 */
  const runTx = React.useCallback(
    async <T,>(label: string, fn: (acc: Address) => Promise<T>): Promise<T | null> => {
      const acc = requireConnected()
      if (!acc) return null
      const wallet = getWalletClient(acc)
      if (!wallet) {
        toast.error("钱包不可用")
        return null
      }
      setIsTxPending(true)
      const toastId = toast.loading(`${label} 中...`, {
        description: "请在钱包中确认交易",
      })
      try {
        const result = await fn(acc)
        toast.success(`${label} 成功`, { id: toastId })
        // 同步刷新用户状态 — 让 action 返回前 UI 已经能看到新链上态。
        // 注意：BSC 公共 RPC 是集群负载均衡，确认 tx 的节点和后续 eth_call 不是同一台，
        // 因此再追加一次 ~3.5s 后的延迟刷新作为兜底（防止读到旧 state root）。
        await refreshUser(acc)
        setTimeout(() => {
          refreshUser(acc)
        }, 3500)
        return result
      } catch (err) {
        const code = (err as { code?: number })?.code
        const msg =
          (err as { shortMessage?: string; message?: string })?.shortMessage ??
          (err as Error)?.message ??
          "交易失败"
        if (code === 4001 || msg.toLowerCase().includes("user rejected")) {
          toast.error(`${label} 已取消`, { id: toastId })
        } else {
          toast.error(`${label} 失败`, { id: toastId, description: msg })
        }
        return null
      } finally {
        setIsTxPending(false)
      }
    },
    [requireConnected, refreshUser],
  )

  // ─── Actions：余额型 ────────────────────────────────────────

  const claimNewPlayerGift = React.useCallback(async (): Promise<boolean> => {
    const result = await runTx("领取新手礼包", (acc) =>
      txClaimNewbieGift(acc, getWalletClient(acc)!),
    )
    return result !== null
  }, [runTx])

  const buyEnergy = React.useCallback(
    async (count: number): Promise<boolean> => {
      if (!staticData) {
        toast.error("链上参数加载中，请稍后")
        return false
      }
      if (count <= 0) return false
      const result = await runTx("购买体力", (acc) =>
        txBuyStamina(acc, getWalletClient(acc)!, BigInt(count), staticData.pricePerPoint),
      )
      return result !== null
    },
    [runTx, staticData],
  )

  const bindReferrer = React.useCallback(
    async (referrerAddress: string): Promise<boolean> => {
      const trimmed = referrerAddress.trim()
      if (!isAddress(trimmed)) {
        toast.error("推荐人地址格式错误", {
          description: "请粘贴完整的 0x 开头的地址",
        })
        return false
      }
      if (address && trimmed.toLowerCase() === address.toLowerCase()) {
        toast.error("不能绑定自己")
        return false
      }
      const result = await runTx("绑定推荐人", (acc) =>
        txBindReferrer(acc, getWalletClient(acc)!, trimmed as Address),
      )
      return result !== null
    },
    [runTx, address],
  )

  // ─── Actions：显式授权（用于「先授权后…」两步 UX） ─────────

  const approveAdvent = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("授权 $REBC", (a) =>
      txApproveAdventForGame(a, getWalletClient(a)!),
    )
    return result !== null
  }, [requireConnected, runTx])

  const approveUsdtForStamina = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("授权 USDT", (a) =>
      txApproveUsdtForStamina(a, getWalletClient(a)!),
    )
    return result !== null
  }, [requireConnected, runTx])

  const approveUsdtForMarketplace = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("授权 USDT (内盘)", (a) =>
      txApproveUsdtForMarketplace(a, getWalletClient(a)!),
    )
    return result !== null
  }, [requireConnected, runTx])

  const approveMaterialsForMarketplace = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("授权材料挂单", (a) =>
      txApproveMaterialsForMarketplace(a, getWalletClient(a)!),
    )
    return result !== null
  }, [requireConnected, runTx])

  // ─── Actions：召唤（commit-reveal） ─────────────────────────

  const summon = React.useCallback(
    async (count: number): Promise<SummonResult> => {
      if (!userState || !staticData) {
        toast.error("数据加载中，请稍后")
        return { ok: false, reason: "loading" }
      }
      if (userState.pendingDraw.exists) {
        toast.error("已有待最终化的召唤请求", {
          description: "请先点击「完成召唤」或取消旧请求",
        })
        return { ok: false, reason: "pending" }
      }
      if (count <= 0) return { ok: false, reason: "invalid" }
      const acc = requireConnected()
      if (!acc) return { ok: false, reason: "wallet" }

      // commit-reveal: 生成 salt → 算 commit → 在签名前先持久化（防止用户断电后丢失 salt）
      const salt = makeSalt()
      const seedCommit = buildCommit(acc, salt)
      persistSalt("draw", acc, salt)

      const estimated = userState.currentDrawPrice * BigInt(count)
      const result = await runTx(`召唤 ×${count}`, (a) =>
        txRequestDraw(a, getWalletClient(a)!, count, seedCommit, estimated),
      )

      if (result === null) {
        // 交易未提交成功 — 清理本次 salt
        clearSalt("draw", acc)
        return { ok: false, reason: "tx" }
      }

      toast.message("等待区块确认随机数后再点击「完成召唤」", {
        description: `延迟约 ${staticData.rngDelayBlocks} 个区块（≈${Number(staticData.rngDelayBlocks) * 3} 秒）`,
      })
      return { ok: true, newCharacters: [] }
    },
    [runTx, userState, staticData],
  )

  const finalizeDraw = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const salt = readSalt("draw", acc)
    if (!salt) {
      toast.error("找不到本次召唤的 salt", {
        description: "salt 仅存在发起请求的浏览器中。请使用相同钱包/设备完成召唤，或先取消重发",
      })
      return false
    }
    const result = await runTx("完成召唤", (a) =>
      txFinalizeDraw(a, getWalletClient(a)!, salt),
    )
    if (result !== null) {
      clearSalt("draw", acc)
      refreshCharacters(acc)
    }
    return result !== null
  }, [requireConnected, runTx, refreshCharacters])

  const cancelDraw = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("取消召唤", (a) => txCancelDraw(a, getWalletClient(a)!))
    if (result !== null) clearSalt("draw", acc)
    return result !== null
  }, [requireConnected, runTx])

  // ─── Actions：合成（commit-reveal） ─────────────────────────

  const synthesize = React.useCallback(
    async (level: RarityLevel): Promise<boolean> => {
      if (!userState) {
        toast.error("数据加载中，请稍后")
        return false
      }
      if (userState.pendingSynthesis.exists) {
        toast.error("已有待最终化的合成请求", {
          description: "请先点击「完成合成」或取消旧请求",
        })
        return false
      }
      const acc = requireConnected()
      if (!acc) return false

      const salt = makeSalt()
      const seedCommit = buildCommit(acc, salt)
      persistSalt("synthesis", acc, salt)

      const result = await runTx(`合成 Lv.${level}`, (a) =>
        txRequestSynthesize(a, getWalletClient(a)!, level, seedCommit),
      )
      if (result === null) {
        clearSalt("synthesis", acc)
        return false
      }
      return true
    },
    [requireConnected, runTx, userState],
  )

  const finalizeSynthesize = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const salt = readSalt("synthesis", acc)
    if (!salt) {
      toast.error("找不到本次合成的 salt", {
        description: "salt 仅存在发起请求的浏览器中。请使用相同钱包/设备完成合成，或先取消重发",
      })
      return false
    }
    const result = await runTx("完成合成", (a) =>
      txFinalizeSynthesize(a, getWalletClient(a)!, salt),
    )
    if (result !== null) {
      clearSalt("synthesis", acc)
      refreshCharacters(acc)
    }
    return result !== null
  }, [requireConnected, runTx, refreshCharacters])

  const cancelSynthesize = React.useCallback(async (): Promise<boolean> => {
    const acc = requireConnected()
    if (!acc) return false
    const result = await runTx("取消合成", (a) =>
      txCancelSynthesize(a, getWalletClient(a)!),
    )
    if (result !== null) clearSalt("synthesis", acc)
    return result !== null
  }, [requireConnected, runTx])

  // ─── Actions：组队 / 副本 ───────────────────────────────────

  const createTeam = React.useCallback(
    async (ids: [string, string, string]): Promise<boolean> => {
      const unique = new Set(ids)
      if (unique.size !== 3) {
        toast.error("需要 3 个不同的角色")
        return false
      }
      try {
        const tokenIds: [bigint, bigint, bigint] = [
          BigInt(ids[0]),
          BigInt(ids[1]),
          BigInt(ids[2]),
        ]
        const result = await runTx("组建队伍", (acc) =>
          txCreateTeam(acc, getWalletClient(acc)!, tokenIds),
        )
        return result !== null
      } catch {
        toast.error("角色 ID 非法")
        return false
      }
    },
    [runTx],
  )

  const disbandTeam = React.useCallback((_teamId: string) => {
    void _teamId
    toast.info("链上不支持解散队伍", {
      description: "队伍一旦创建即永久存在 — 可继续挑战其他副本",
    })
  }, [])

  const challenge = React.useCallback(
    async (
      teamId: string,
      dungeonLevel: number,
    ): Promise<{ ok: boolean; result: ChallengeResult | null }> => {
      const teamIndex = Number(teamId)
      if (!Number.isInteger(teamIndex) || teamIndex < 0) {
        toast.error("队伍索引非法")
        return { ok: false, result: null }
      }
      const tx = await runTx(
        `挑战副本 ${dungeonLevel}`,
        (acc) => txChallenge(acc, getWalletClient(acc)!, teamIndex, dungeonLevel),
      )
      // tx === null：runTx 已捕获用户拒签 / 链上 revert，并已 toast 报错
      // tx !== null：tx 已成功上链；result 可能是事件解析结果，也可能是 null（极少数解析失败）
      // 关键：tx 成功但 result 为 null 时也要走"成功"分支，由动效 fallback 到副本默认掉落，
      // 否则用户会看到误导性的"出征失败"，但实际上链上材料已计入背包。
      if (!tx) return { ok: false, result: null }
      // 挑战成功后主动刷新角色列表（队伍冷却时间靠 userState 已经在 runTx 内刷过了）
      if (address) refreshCharacters(address)
      return { ok: true, result: tx.result }
    },
    [runTx, address, refreshCharacters],
  )

  // ─── Actions：市场 ───────────────────────────────────────────

  const listMaterial = React.useCallback(
    async (material: MaterialKey, amount: number, pricePerUnit: number): Promise<boolean> => {
      if (amount <= 0 || pricePerUnit <= 0) {
        toast.error("数量或单价非法")
        return false
      }
      // 链上以 0.1 为最小单位 — UI 数量 N 实际转为 N × MATERIAL_UNIT(=10)；
      // pricePerUnit 仍按"1 个材料"计价（USDT 18 位）
      const chainAmount = BigInt(Math.round(amount * MATERIAL_UNIT_NUM))
      const result = await runTx("挂单", (acc) =>
        txCreateOrder(
          acc,
          getWalletClient(acc)!,
          material,
          chainAmount,
          parseToken(pricePerUnit),
        ),
      )
      if (result !== null) refreshOrders()
      return result !== null
    },
    [runTx, refreshOrders],
  )

  const cancelListing = React.useCallback(
    async (id: string): Promise<boolean> => {
      let orderId: bigint
      try {
        orderId = BigInt(id)
      } catch {
        toast.error("订单 ID 非法")
        return false
      }
      const result = await runTx("撤销挂单", (acc) =>
        txCancelOrder(acc, getWalletClient(acc)!, orderId),
      )
      if (result !== null) refreshOrders()
      return result !== null
    },
    [runTx, refreshOrders],
  )

  const buyListing = React.useCallback(
    async (id: string, amount: number): Promise<boolean> => {
      let orderId: bigint
      try {
        orderId = BigInt(id)
      } catch {
        toast.error("订单 ID 非法")
        return false
      }

      let order = chainOrders.find((o) => o.orderId === orderId) ?? null
      if (!order) {
        try {
          order = await readMarketOrder(orderId)
        } catch (err) {
          console.error("[GameProvider] readMarketOrder failed:", err)
        }
      }
      if (!order) {
        toast.error("订单不存在或已成交")
        return false
      }
      if (amount <= 0) return false
      // 用户输入"个数"，链上单位是 0.1 — 数量 ×10；
      // 但 pricePerUnit 是"链上每个最小单位的 USDT 价"，所以 totalCost = price × chainAmount
      const chainAmount = BigInt(Math.round(amount * MATERIAL_UNIT_NUM))
      const totalCost = order.pricePerUnit * chainAmount
      const result = await runTx("购入材料", (acc) =>
        txBuyOrder(acc, getWalletClient(acc)!, order.orderId, chainAmount, totalCost),
      )
      if (result !== null) refreshOrders()
      return result !== null
    },
    [runTx, refreshOrders, chainOrders],
  )

  // ─── 派生数据 ───────────────────────────────────────────────

  const advent = userState ? tokenToNumber(userState.adventBalance) : 0
  const usdt = userState ? tokenToNumber(userState.usdtBalance) : 0
  const energy = userState ? bigintToNumber(userState.staminaPoints) : 0

  // 链上库存以 0.1 为最小单位 — 除以 MATERIAL_UNIT 转回用户视角的"整数 + 1 位小数"
  const inventory: Inventory = userState
    ? {
        AE: Number(userState.materialBalances.AE) / MATERIAL_UNIT_NUM,
        BF: Number(userState.materialBalances.BF) / MATERIAL_UNIT_NUM,
        MR: Number(userState.materialBalances.MR) / MATERIAL_UNIT_NUM,
        ES: Number(userState.materialBalances.ES) / MATERIAL_UNIT_NUM,
      }
    : initialInventory

  const characters: Character[] = React.useMemo(
    () => chainCharacters.map(chainCharToUi),
    [chainCharacters],
  )

  const teams: Team[] = React.useMemo(() => {
    if (!userState || !staticData) return []
    return userState.teams.map((t, i) => chainTeamToUi(t, i, staticData.cooldownSeconds))
  }, [userState, staticData])

  const listings: MarketListing[] = React.useMemo(() => {
    return chainOrders
      .map((o) => chainOrderToUi(o, address))
      .filter((x): x is MarketListing => x !== null)
  }, [chainOrders, address])

  const globalSummoned = userState ? bigintToNumber(userState.drawnCount) : 0
  const charCap = staticData ? bigintToNumber(staticData.drawCap) : 6_000
  const currentSummonCost = userState ? tokenToNumber(userState.currentDrawPrice) : 50_000

  // ADVENT → Game 授权状态：足以覆盖一次 ×10 召唤的 1.5x buffer（≈15 倍当前单价）即可视为已授权
  const adventAllowanceForGame = userState?.adventAllowanceForGame ?? 0n
  const isAdventApproved = userState
    ? adventAllowanceForGame >= userState.currentDrawPrice * 15n
    : false

  // USDT → Stamina 授权状态：阈值取一个保守的"购买 100 点体力"额度
  // （单价从 staticData.pricePerPoint 取，未加载时退化为 0n — 此时按未授权处理）
  const usdtAllowanceForStamina = userState?.usdtAllowanceForStamina ?? 0n
  const isUsdtApprovedForStamina =
    !!userState &&
    !!staticData &&
    usdtAllowanceForStamina >= staticData.pricePerPoint * 100n

  // USDT → Marketplace 授权额度（BuyDialog 按本次买单 totalCost 比对决定是否需要授权）
  const usdtAllowanceForMarketplace = userState?.usdtAllowanceForMarketplace ?? 0n

  // Materials → Marketplace 授权（一次签 setApprovalForAll(true) 即终身授权）
  const isMaterialsApprovedForMarketplace =
    userState?.materialsApprovedForMarketplace ?? false

  const referrerAddr = userState?.referrer
  const referrer =
    referrerAddr && referrerAddr !== zeroAddress ? referrerAddr : undefined
  const effectiveDirect =
    userState?.effectiveDirect && userState.effectiveDirect !== zeroAddress
      ? userState.effectiveDirect
      : undefined
  const effectiveIndirect =
    userState?.effectiveIndirect && userState.effectiveIndirect !== zeroAddress
      ? userState.effectiveIndirect
      : undefined

  // 取实时区块号 — 优先使用 fast ticker 的 liveBlock；首次拿不到时回落到 multicall 里的 blockNumber
  const effectiveBlock =
    liveBlock > 0n ? liveBlock : (userState?.blockNumber ?? 0n)

  // commit-reveal pending 派生
  const pendingDraw: PendingDrawState | null = React.useMemo(() => {
    if (!userState || !staticData) return null
    const p = userState.pendingDraw
    if (!p.exists) return null
    const readyAt = p.requestBlock + staticData.rngDelayBlocks
    const expireAt = p.requestBlock + staticData.rngExpiryBlocks
    return {
      count: p.count,
      readyAtBlock: readyAt,
      ready: effectiveBlock >= readyAt,
      expired: effectiveBlock > expireAt,
    }
  }, [userState, staticData, effectiveBlock])

  const pendingSynthesis: PendingSynthState | null = React.useMemo(() => {
    if (!userState || !staticData) return null
    const p = userState.pendingSynthesis
    if (!p.exists) return null
    const readyAt = p.requestBlock + staticData.rngDelayBlocks
    const expireAt = p.requestBlock + staticData.rngExpiryBlocks
    return {
      targetLevel: p.count as RarityLevel,
      readyAtBlock: readyAt,
      ready: effectiveBlock >= readyAt,
      expired: effectiveBlock > expireAt,
    }
  }, [userState, staticData, effectiveBlock])

  const value: GameContextValue = {
    connected,
    address,
    shortAddress: address ? shortenAddress(address) : undefined,
    chainId,
    walletKind,
    isRealWallet: true,
    isWrongChain,
    connect,
    disconnect,
    advent,
    usdt,
    energy,
    inventory,
    characters,
    teams,
    globalSummoned,
    charCap,
    currentSummonCost,
    referrer,
    effectiveDirect,
    effectiveIndirect,
    myReferralCode: address ?? "",
    listings,
    setMarketMaterialFilter,
    marketLoadedMatchCount,
    marketHasMore,
    ensureMarketWindow,
    newPlayerGiftClaimed: userState?.newbieGiftClaimed ?? false,
    pendingDraw,
    pendingSynthesis,
    currentBlock: effectiveBlock,
    rngDelayBlocks: staticData?.rngDelayBlocks ?? 0n,
    rngExpiryBlocks: staticData?.rngExpiryBlocks ?? 0n,
    adventAllowanceForGame,
    isAdventApproved,
    approveAdvent,
    usdtAllowanceForStamina,
    isUsdtApprovedForStamina,
    approveUsdtForStamina,
    usdtAllowanceForMarketplace,
    approveUsdtForMarketplace,
    isMaterialsApprovedForMarketplace,
    approveMaterialsForMarketplace,
    isLoading,
    isTxPending,
    refresh,
    claimNewPlayerGift,
    buyEnergy,
    bindReferrer,
    summon,
    finalizeDraw,
    cancelDraw,
    synthesize,
    finalizeSynthesize,
    cancelSynthesize,
    createTeam,
    disbandTeam,
    challenge,
    listMaterial,
    cancelListing,
    buyListing,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = React.useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}

export {
  RARITIES,
  RARITY_BY_LEVEL,
  MATERIAL_KEYS,
  DUNGEONS,
  SYNTHESIS_COSTS,
  SUMMON_TIER_SIZE,
  explorer,
}
