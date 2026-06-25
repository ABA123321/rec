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
 * 召唤 / 合成单笔即时：draw(count) / synthesize(level)，与副本挑战同一套链上熵。
 */

import * as React from "react"
import { usePathname } from "next/navigation"
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
  normalizeRarityLevel,
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
  readGlobalDrawEconomy,
  summonUnitPriceForTx,
  type GlobalDrawEconomy,
} from "@/lib/web3/draw-price"
import { useSummonOpens } from "@/lib/hooks/use-summon-opens"

/** UI 视角的"1 个材料"对应链上 0.1 单位的整数倍 — Number 形式便于 UI 计算 */
const MATERIAL_UNIT_NUM = Number(MATERIAL_UNIT)
import {
  MARKET_ACTIVE_ORDER_LIMIT,
  readGameStatic,
  readMarketOrder,
  readMarketOrderPage,
  readOwnedCharacters,
  readProgressState,
  readExpeditionChainStates,
  readUserState,
  type ExpeditionChainState,
  getOrderPageScanBudget,
  type ChainCharacter,
  type ChainOrder,
  type GameStatic,
  type ProgressState,
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
  txCancelOrder,
  txChallenge,
  txChallengeExpeditionChain,
  type ChallengeResult,
  txClaimDailySpecialistReward,
  txClaimNewbieGift,
  txCreateOrder,
  txCreateTeam,
  txDraw,
  txSynthesize,
  txBindResonancePartner,
  txClaimResonanceReward,
  txReplaceTeamMember,
  txUnbindTeamCharacter,
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
  newCharacters?: Character[]
  reason?: string
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
  /** Unix seconds; 0 = no gate */
  drawOpensAt: number
  /** false while block time < drawOpensAt */
  isSummonOpen: boolean

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

  /** P0/P1/P2 进度合约状态（GameProgress） */
  progressState: ProgressState | null
  expeditionChainStates: ExpeditionChainState[]
  unbindAdventCost: bigint
  unbindCooldownSeconds: bigint
  expeditionChainMaterialBps: number
  expeditionChainExtraStamina: number
  expeditionChainSteps: number

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
  claimDailySpecialistReward: () => Promise<boolean>
  bindResonancePartner: (partner: string) => Promise<boolean>
  claimResonanceReward: () => Promise<boolean>
  buyEnergy: (count: number) => Promise<boolean>
  bindReferrer: (referrerAddress: string) => Promise<boolean>

  summon: (count: number) => Promise<SummonResult>
  synthesize: (level: RarityLevel) => Promise<boolean>

  createTeam: (ids: [string, string, string], name?: string) => Promise<boolean>
  challenge: (
    teamId: string,
    dungeonLevel: number,
  ) => Promise<{ ok: boolean; result: ChallengeResult | null }>
  challengeExpeditionChain: (
    teamId: string,
    dungeonLevels: number[],
  ) => Promise<{ ok: boolean; result: ChallengeResult | null }>
  unbindTeamCharacter: (
    teamId: string,
    slotIndex: number,
  ) => Promise<boolean>
  replaceTeamMember: (
    teamId: string,
    slotIndex: number,
    characterId: string,
  ) => Promise<boolean>

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
  const classIndex =
    c.classId > 0 ? Math.min(c.classId - 1, CLASS_NAMES.length - 1) : Number(c.tokenId % 1000n) % CLASS_NAMES.length
  return {
    id: c.tokenId.toString(),
    rarity: normalizeRarityLevel(c.level),
    power: c.power,
    classIndex,
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

const COOLDOWN_MS = 90 * 60 * 1000

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
  const [globalDrawEconomy, setGlobalDrawEconomy] = React.useState<GlobalDrawEconomy | null>(
    null,
  )
  const [userState, setUserState] = React.useState<UserState | null>(null)
  const [progressState, setProgressState] = React.useState<ProgressState | null>(null)
  const [expeditionChainStates, setExpeditionChainStates] = React.useState<ExpeditionChainState[]>([])
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
  const pathname = usePathname()
  const shouldPollMarket = pathname?.startsWith("/game/market") ?? false
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
      const [state, progress] = await Promise.all([readUserState(addr), readProgressState(addr)])
      setUserState(state)
      setProgressState(progress)
      const chains = await readExpeditionChainStates(addr, state.teams.length)
      setExpeditionChainStates(chains)
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

  const refreshGlobalDrawEconomy = React.useCallback(async () => {
    try {
      const economy = await readGlobalDrawEconomy()
      setGlobalDrawEconomy(economy)
    } catch (err) {
      console.error("[GameProvider] readGlobalDrawEconomy failed:", err)
    }
  }, [])

  const refresh = React.useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    await Promise.all([
      refreshUser(address),
      refreshOrders(),
      refreshCharacters(address),
      refreshGlobalDrawEconomy(),
    ])
    setIsLoading(false)
  }, [address, refreshUser, refreshOrders, refreshCharacters, refreshGlobalDrawEconomy])

  // 启动：拉静态 + 全服召唤经济（无需钱包）
  React.useEffect(() => {
    refreshStatic()
    refreshGlobalDrawEconomy()
  }, [refreshStatic, refreshGlobalDrawEconomy])

  // 15 秒轮询全服召唤价 / 进度（DEX 现货预估 + drawnCount；不依赖钱包连接）
  React.useEffect(() => {
    if (!docVisible) return
    const id = setInterval(refreshGlobalDrawEconomy, 15_000)
    return () => clearInterval(id)
  }, [docVisible, refreshGlobalDrawEconomy])

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
  // 角色列表不轮询 — 仅在召唤 / 合成 / 转账后主动 refreshCharacters）
  // 市场订单仅在 /game/market 路由轮询，其余页面跳过 refreshOrders
  React.useEffect(() => {
    if (!address || !docVisible) return
    const id = setInterval(() => {
      refreshUser(address)
      if (shouldPollMarket) refreshOrders()
    }, 30_000)
    return () => clearInterval(id)
  }, [address, docVisible, refreshUser, refreshOrders, shouldPollMarket])

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

  const claimDailySpecialistReward = React.useCallback(async (): Promise<boolean> => {
    const result = await runTx("领取日任务奖励", (acc) =>
      txClaimDailySpecialistReward(acc, getWalletClient(acc)!),
    )
    return result !== null
  }, [runTx])

  const bindResonancePartner = React.useCallback(
    async (partner: string): Promise<boolean> => {
      const trimmed = partner.trim()
      if (!isAddress(trimmed)) {
        toast.error("伙伴地址格式错误")
        return false
      }
      const result = await runTx("绑定共振伙伴", (acc) =>
        txBindResonancePartner(acc, getWalletClient(acc)!, trimmed as Address),
      )
      return result !== null
    },
    [runTx],
  )

  const claimResonanceReward = React.useCallback(async (): Promise<boolean> => {
    const result = await runTx("领取共振奖励", (acc) =>
      txClaimResonanceReward(acc, getWalletClient(acc)!),
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
    const result = await runTx("授权 $草根社", (a) =>
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

  // ─── Actions：召唤（单笔即时） ─────────────────────────────

  const summon = React.useCallback(
    async (count: number): Promise<SummonResult> => {
      if (!userState) {
        toast.error("数据加载中，请稍后")
        return { ok: false, reason: "loading" }
      }
      if (count <= 0) return { ok: false, reason: "invalid" }
      const opensAt = staticData?.drawOpensAt ?? 0
      if (opensAt > 0 && Math.floor(Date.now() / 1000) < opensAt) {
        toast.error("召唤尚未开启")
        return { ok: false, reason: "not_open" }
      }
      const acc = requireConnected()
      if (!acc) return { ok: false, reason: "wallet" }

      const unitPrice =
        summonUnitPriceForTx(globalDrawEconomy) || userState.currentDrawPrice
      const estimated = unitPrice * BigInt(count)
      const result = await runTx(`召唤 ×${count}`, (a) =>
        txDraw(a, getWalletClient(a)!, count, estimated),
      )

      if (result === null) return { ok: false, reason: "tx" }

      await Promise.all([refreshUser(acc), refreshCharacters(acc), refreshGlobalDrawEconomy()])
      return { ok: true, newCharacters: [] }
    },
    [runTx, userState, requireConnected, refreshUser, refreshCharacters, globalDrawEconomy, refreshGlobalDrawEconomy, staticData],
  )

  // ─── Actions：合成（单笔即时） ─────────────────────────────

  const synthesize = React.useCallback(
    async (level: RarityLevel): Promise<boolean> => {
      if (!userState) {
        toast.error("数据加载中，请稍后")
        return false
      }
      const acc = requireConnected()
      if (!acc) return false

      const result = await runTx(`合成 Lv.${level}`, (a) =>
        txSynthesize(a, getWalletClient(a)!, level),
      )
      if (result === null) return false

      await Promise.all([refreshUser(acc), refreshCharacters(acc)])
      return true
    },
    [requireConnected, runTx, userState, refreshUser, refreshCharacters],
  )

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

  const challengeExpeditionChain = React.useCallback(
    async (
      teamId: string,
      dungeonLevels: number[],
    ): Promise<{ ok: boolean; result: ChallengeResult | null }> => {
      const teamIndex = Number(teamId)
      if (!Number.isInteger(teamIndex) || teamIndex < 0) {
        toast.error("队伍索引非法")
        return { ok: false, result: null }
      }
      const tx = await runTx(
        `远征链 ${dungeonLevels.join("→")}`,
        (acc) =>
          txChallengeExpeditionChain(acc, getWalletClient(acc)!, teamIndex, dungeonLevels),
      )
      if (!tx) return { ok: false, result: null }
      if (address) {
        refreshCharacters(address)
        await refreshUser(address)
      }
      return { ok: true, result: tx.result }
    },
    [runTx, address, refreshCharacters, refreshUser],
  )

  const unbindTeamCharacter = React.useCallback(
    async (teamId: string, slotIndex: number): Promise<boolean> => {
      const teamIndex = Number(teamId)
      if (!Number.isInteger(teamIndex) || teamIndex < 0 || slotIndex < 0 || slotIndex > 2) {
        toast.error("参数非法")
        return false
      }
      const cost = staticData?.unbindAdventCost ?? 0n
      if (cost === 0n) {
        toast.error("解绑功能未开启")
        return false
      }
      const result = await runTx("解绑队员", (acc) =>
        txUnbindTeamCharacter(acc, getWalletClient(acc)!, teamIndex, slotIndex, cost),
      )
      return result !== null
    },
    [runTx, staticData],
  )

  const replaceTeamMember = React.useCallback(
    async (teamId: string, slotIndex: number, characterId: string): Promise<boolean> => {
      const teamIndex = Number(teamId)
      if (!Number.isInteger(teamIndex) || teamIndex < 0 || slotIndex < 0 || slotIndex > 2) {
        toast.error("参数非法")
        return false
      }
      try {
        const tokenId = BigInt(characterId)
        const result = await runTx("调整队员", (acc) =>
          txReplaceTeamMember(acc, getWalletClient(acc)!, teamIndex, slotIndex, tokenId),
        )
        return result !== null
      } catch {
        toast.error("角色 ID 非法")
        return false
      }
    },
    [runTx],
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
  const inventory: Inventory = React.useMemo(
    () =>
      userState
        ? {
            AE: Number(userState.materialBalances.AE) / MATERIAL_UNIT_NUM,
            BF: Number(userState.materialBalances.BF) / MATERIAL_UNIT_NUM,
            MR: Number(userState.materialBalances.MR) / MATERIAL_UNIT_NUM,
            ES: Number(userState.materialBalances.ES) / MATERIAL_UNIT_NUM,
          }
        : initialInventory,
    [userState],
  )

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

  const globalSummoned = globalDrawEconomy
    ? bigintToNumber(globalDrawEconomy.drawnCount)
    : userState
      ? bigintToNumber(userState.drawnCount)
      : 0
  const charCap = staticData ? bigintToNumber(staticData.drawCap) : 6_000
  const drawOpensAt = staticData?.drawOpensAt ?? 0
  const { isOpen: isSummonOpen } = useSummonOpens(drawOpensAt)
  const currentSummonCost = globalDrawEconomy
    ? tokenToNumber(globalDrawEconomy.displayDrawPrice)
    : userState
      ? tokenToNumber(userState.currentDrawPrice)
      : 0

  const summonUnitPrice =
    summonUnitPriceForTx(globalDrawEconomy) ||
    userState?.currentDrawPrice ||
    0n
  // ADVENT → Game 授权状态：足以覆盖一次 ×10 召唤的 1.5x buffer（≈15 倍当前单价）即可视为已授权
  const adventAllowanceForGame = userState?.adventAllowanceForGame ?? 0n
  const isAdventApproved = userState
    ? adventAllowanceForGame >= summonUnitPrice * 15n
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

  const value: GameContextValue = React.useMemo(
    () => ({
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
      drawOpensAt,
      isSummonOpen,
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
      progressState,
      expeditionChainStates,
      unbindAdventCost: staticData?.unbindAdventCost ?? 0n,
      unbindCooldownSeconds: staticData?.unbindCooldownSeconds ?? 0n,
      expeditionChainMaterialBps: staticData?.expeditionChainMaterialBps ?? 13_000,
      expeditionChainExtraStamina: staticData?.expeditionChainExtraStamina ?? 2,
      expeditionChainSteps: staticData?.expeditionChainSteps ?? 3,
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
      claimDailySpecialistReward,
      bindResonancePartner,
      claimResonanceReward,
      buyEnergy,
      bindReferrer,
      summon,
      synthesize,
      createTeam,
      challenge,
      challengeExpeditionChain,
      unbindTeamCharacter,
      replaceTeamMember,
      listMaterial,
      cancelListing,
      buyListing,
    }),
    [
      connected,
      address,
      chainId,
      walletKind,
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
      drawOpensAt,
      isSummonOpen,
      referrer,
      effectiveDirect,
      effectiveIndirect,
      listings,
      setMarketMaterialFilter,
      marketLoadedMatchCount,
      marketHasMore,
      ensureMarketWindow,
      userState?.newbieGiftClaimed,
      progressState,
      expeditionChainStates,
      staticData?.unbindAdventCost,
      staticData?.unbindCooldownSeconds,
      staticData?.expeditionChainMaterialBps,
      staticData?.expeditionChainExtraStamina,
      staticData?.expeditionChainSteps,
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
      claimDailySpecialistReward,
      bindResonancePartner,
      claimResonanceReward,
      buyEnergy,
      bindReferrer,
      summon,
      synthesize,
      createTeam,
      challenge,
      challengeExpeditionChain,
      unbindTeamCharacter,
      replaceTeamMember,
      listMaterial,
      cancelListing,
      buyListing,
    ],
  )

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
