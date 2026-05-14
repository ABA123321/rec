/**
 * 链上读数据 —— 全部走 publicClient 的 multicall，最大化吞吐。
 */
import {
  type Address,
  createPublicClient,
  http,
  parseAbiItem,
  zeroAddress,
} from "viem"

import { getPublicClient } from "./client"
import {
  ABIS,
  CONTRACTS,
  ERC20_ABI,
  MATERIAL_IDS,
  type MaterialKey,
} from "./contracts"

/**
 * 合约部署起始区块 — eth_getLogs 的扫描下界。
 *
 * 优先读取 `NEXT_PUBLIC_DEPLOY_BLOCK`（生产建议必填，否则可能从 0 扫到打爆 RPC）；
 * fallback 是用户最初提供的部署高度。
 */
export const DEPLOY_BLOCK: bigint = (() => {
  const raw = (process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? "").trim()
  if (raw && /^\d+$/.test(raw)) return BigInt(raw)
  return 95849570n
})()

// ─── 全局静态参数 ────────────────────────────────────────────────

export type GameStatic = {
  drawCap: bigint
  baseDrawPrice: bigint
  drawPriceStep: bigint
  drawPriceStepBps: bigint
  rngDelayBlocks: bigint
  rngExpiryBlocks: bigint
  maxTeamsPerAccount: bigint
  teamSize: bigint
  cooldownSeconds: bigint
  newbieGift: bigint
  pricePerPoint: bigint
  feeBps: bigint
}

let _staticCache: GameStatic | null = null

export async function readGameStatic(): Promise<GameStatic> {
  if (_staticCache) return _staticCache
  const client = getPublicClient()
  const game = { address: CONTRACTS.Game, abi: ABIS.Game } as const
  const stamina = { address: CONTRACTS.Stamina, abi: ABIS.Stamina } as const
  const market = { address: CONTRACTS.Marketplace, abi: ABIS.Marketplace } as const

  const r = await client.multicall({
    contracts: [
      { ...game, functionName: "DRAW_CAP" },
      { ...game, functionName: "BASE_DRAW_PRICE" },
      { ...game, functionName: "DRAW_PRICE_STEP" },
      { ...game, functionName: "DRAW_PRICE_STEP_BPS" },
      { ...game, functionName: "RNG_DELAY_BLOCKS" },
      { ...game, functionName: "RNG_EXPIRY_BLOCKS" },
      { ...game, functionName: "MAX_TEAMS_PER_ACCOUNT" },
      { ...game, functionName: "TEAM_SIZE" },
      { ...game, functionName: "COOLDOWN_SECONDS" },
      { ...stamina, functionName: "NEWBIE_GIFT" },
      { ...stamina, functionName: "pricePerPoint" },
      { ...market, functionName: "FEE_BPS" },
    ],
    allowFailure: false,
  })

  _staticCache = {
    drawCap: r[0] as bigint,
    baseDrawPrice: r[1] as bigint,
    drawPriceStep: r[2] as bigint,
    drawPriceStepBps: r[3] as bigint,
    rngDelayBlocks: r[4] as bigint,
    rngExpiryBlocks: r[5] as bigint,
    maxTeamsPerAccount: r[6] as bigint,
    teamSize: r[7] as bigint,
    cooldownSeconds: r[8] as bigint,
    newbieGift: r[9] as bigint,
    pricePerPoint: r[10] as bigint,
    feeBps: r[11] as bigint,
  }
  return _staticCache
}

// ─── 用户实时状态（每次刷新拉一次） ─────────────────────────────

export type PendingRequest = {
  exists: boolean
  count: number // pendingDraw count；pendingSynthesis 时是 targetLevel
  requestBlock: bigint
  seedCommit: `0x${string}`
}

export type ChainTeam = {
  characterIds: [bigint, bigint, bigint]
  lastChallengeAt: bigint
}

export type UserState = {
  usdtBalance: bigint
  adventBalance: bigint
  staminaPoints: bigint
  materialBalances: Record<MaterialKey, bigint>
  characterCount: bigint
  newbieGiftClaimed: boolean
  referrer: Address // 0x0 if none
  effectiveDirect: Address
  effectiveIndirect: Address
  currentDrawPrice: bigint
  drawnCount: bigint
  pendingDraw: PendingRequest
  pendingSynthesis: PendingRequest
  teams: ChainTeam[]
  blockNumber: bigint
  /** ADVENT.allowance(account, Game) — UI 用以判断是否需要先弹"授权"按钮 */
  adventAllowanceForGame: bigint
  /** USDT.allowance(account, Stamina) — 购买体力前需要授权 USDT */
  usdtAllowanceForStamina: bigint
  /** USDT.allowance(account, Marketplace) — 内盘买单前需要授权 USDT */
  usdtAllowanceForMarketplace: bigint
  /** Materials.isApprovedForAll(account, Marketplace) — 挂单前需要授权 ERC1155 */
  materialsApprovedForMarketplace: boolean
}

export async function readUserState(addr: Address): Promise<UserState> {
  const client = getPublicClient()
  const matIds = [MATERIAL_IDS.AE, MATERIAL_IDS.BF, MATERIAL_IDS.MR, MATERIAL_IDS.ES]

  const [r, blockNumber] = await Promise.all([
    client.multicall({
      contracts: [
        { address: CONTRACTS.USDT, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] },
        {
          address: CONTRACTS.AdventToken,
          abi: ABIS.AdventToken,
          functionName: "balanceOf",
          args: [addr],
        },
        {
          address: CONTRACTS.Stamina,
          abi: ABIS.Stamina,
          functionName: "stamina",
          args: [addr],
        },
        {
          address: CONTRACTS.Stamina,
          abi: ABIS.Stamina,
          functionName: "claimedNewbieGift",
          args: [addr],
        },
        {
          address: CONTRACTS.Materials,
          abi: ABIS.Materials,
          functionName: "balanceOfBatch",
          args: [Array(4).fill(addr) as Address[], matIds],
        },
        {
          address: CONTRACTS.CharacterNFT,
          abi: ABIS.CharacterNFT,
          functionName: "balanceOf",
          args: [addr],
        },
        {
          address: CONTRACTS.ReferralRegistry,
          abi: ABIS.ReferralRegistry,
          functionName: "referrerOf",
          args: [addr],
        },
        {
          address: CONTRACTS.ReferralRegistry,
          abi: ABIS.ReferralRegistry,
          functionName: "effectiveReferrers",
          args: [addr],
        },
        { address: CONTRACTS.Game, abi: ABIS.Game, functionName: "currentDrawPrice" },
        { address: CONTRACTS.Game, abi: ABIS.Game, functionName: "drawnCount" },
        {
          address: CONTRACTS.Game,
          abi: ABIS.Game,
          functionName: "pendingDraw",
          args: [addr],
        },
        {
          address: CONTRACTS.Game,
          abi: ABIS.Game,
          functionName: "pendingSynthesis",
          args: [addr],
        },
        { address: CONTRACTS.Game, abi: ABIS.Game, functionName: "teamsOf", args: [addr] },
        {
          address: CONTRACTS.AdventToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [addr, CONTRACTS.Game],
        },
        {
          address: CONTRACTS.USDT,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [addr, CONTRACTS.Stamina],
        },
        {
          address: CONTRACTS.USDT,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [addr, CONTRACTS.Marketplace],
        },
        {
          address: CONTRACTS.Materials,
          abi: ABIS.Materials,
          functionName: "isApprovedForAll",
          args: [addr, CONTRACTS.Marketplace],
        },
      ],
      allowFailure: false,
    }),
    client.getBlockNumber(),
  ])

  const matArr = r[4] as readonly bigint[]
  const matBalances: Record<MaterialKey, bigint> = {
    AE: matArr[0] ?? 0n,
    BF: matArr[1] ?? 0n,
    MR: matArr[2] ?? 0n,
    ES: matArr[3] ?? 0n,
  }
  const eff = r[7] as readonly [Address, Address]
  // 注意：合约里 requestBlock 是 uint40 — viem 对 uintN(N<=48) 解码为 `number`（不是 bigint）。
  // 这里统一转 bigint，避免下游和 currentBlock / staticData.rngDelayBlocks（uint256→bigint）混算时报
  // "Cannot mix BigInt and other types"。
  const draw = r[10] as readonly [number, number, `0x${string}`, boolean]
  const synth = r[11] as readonly [number, number, `0x${string}`, boolean]
  // 同样：lastChallengeAt 是 uint40 → number；这里在下方 map 时统一转 bigint
  const teams = r[12] as readonly {
    characterIds: readonly [bigint, bigint, bigint]
    lastChallengeAt: number
  }[]

  return {
    usdtBalance: r[0] as bigint,
    adventBalance: r[1] as bigint,
    staminaPoints: r[2] as bigint,
    newbieGiftClaimed: r[3] as boolean,
    materialBalances: matBalances,
    characterCount: r[5] as bigint,
    referrer: r[6] as Address,
    effectiveDirect: eff[0],
    effectiveIndirect: eff[1],
    currentDrawPrice: r[8] as bigint,
    drawnCount: r[9] as bigint,
    pendingDraw: {
      count: draw[0],
      requestBlock: BigInt(draw[1]),
      seedCommit: draw[2],
      exists: draw[3],
    },
    pendingSynthesis: {
      count: synth[0],
      requestBlock: BigInt(synth[1]),
      seedCommit: synth[2],
      exists: synth[3],
    },
    teams: teams.map((t) => ({
      characterIds: [...t.characterIds] as [bigint, bigint, bigint],
      lastChallengeAt: BigInt(t.lastChallengeAt),
    })),
    blockNumber,
    adventAllowanceForGame: r[13] as bigint,
    usdtAllowanceForStamina: r[14] as bigint,
    usdtAllowanceForMarketplace: r[15] as bigint,
    materialsApprovedForMarketplace: r[16] as boolean,
  }
}

// ─── 角色 NFT 列表（基于 Transfer event diff） ──────────────────

export type ChainCharacter = {
  tokenId: bigint
  level: number
  power: number
}

/**
 * 读取玩家持有的角色 NFT。
 *
 * 早期实现走 `eth_getLogs(Transfer)` 事件回扫 — 在 BSC 上跨数千万区块时
 * 必然触发 RPC 的"Request exceeds defined limit"，前端因此一直拿不到角色列表，
 * 直接导致组队页面空白、副本无法出战。
 *
 * 现在改为：
 *   1) 调用 `nextTokenId()` 拿全网铸造总量 N；
 *   2) multicall3 分段批量 `ownerOf(0..N-1)`（allowFailure，跳过被销毁的 token）；
 *   3) 过滤出 owner == 用户的 tokenId，再 multicall 批量读 `characters(id)`。
 *
 * **注意（性能）**：viem 的 `multicall` 在默认 `batchSize ≈ 1024` **字节**下会把大批
 * `ownerOf` 拆成海量子批次并对 RPC **并行** `eth_call`。当 N 为数千～五万时，会在一瞬间
 * 打出上千并行请求，浏览器与 RPC 都会卡死。此处按固定 token 窗口 **顺序** 扫描，并对单次
 * multicall 传入更大的 `batchSize`，把每一段的 RPC 并行度压到 1～几次。
 *
 * 适用约束：全网铸造总量 ≤ ~5 万级时性能良好；超过后建议接入 The Graph 等子图。
 */
const MAX_SUPPLY_SCAN = 50_000n

/** 每轮顺序扫描的 token 数量 —— 宁小勿爆并行 RPC / 单次 multicall 解析峰值内存 */
const OWNER_OF_SLICE = 200
/** 单次 aggregate 内允许的字节上限 —— 避免 viem 再把一轮切成几十路并行 */
const OWNER_MULTICALL_BATCH_BYTES = 524_288

export async function readOwnedCharacters(
  owner: Address,
): Promise<ChainCharacter[]> {
  const client = getPublicClient()

  const nextTokenId = (await client.readContract({
    address: CONTRACTS.CharacterNFT,
    abi: ABIS.CharacterNFT,
    functionName: "nextTokenId",
  })) as bigint

  if (nextTokenId === 0n) return []
  if (nextTokenId > MAX_SUPPLY_SCAN) {
    console.warn(
      `[reads] CharacterNFT.nextTokenId=${nextTokenId} 超过 ${MAX_SUPPLY_SCAN} — 仅扫描最近的 ${MAX_SUPPLY_SCAN} 个 tokenId`,
    )
  }

  const scanStart = nextTokenId > MAX_SUPPLY_SCAN ? nextTokenId - MAX_SUPPLY_SCAN : 0n
  const scanEnd = nextTokenId

  const ownerLower = owner.toLowerCase()
  const ownedIds: bigint[] = []

  // 第一步：分段查 owner —— 顺序执行每一段 multicall，禁止数万路并行 eth_call。
  // 不显式构造完整 tokenIdRange[]（最多五万个 BigInt），避免单次调用峰值占用数十 MB 堆内存。
  for (let chunkStart = scanStart; chunkStart < scanEnd; ) {
    const remaining = Number(scanEnd - chunkStart)
    const n = Math.min(OWNER_OF_SLICE, remaining)
    const slice: bigint[] = []
    for (let j = 0; j < n; j++) slice.push(chunkStart + BigInt(j))
    chunkStart += BigInt(n)

    const ownerResults = await client.multicall({
      contracts: slice.map((tokenId) => ({
        address: CONTRACTS.CharacterNFT,
        abi: ABIS.CharacterNFT,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      })),
      allowFailure: true,
      batchSize: OWNER_MULTICALL_BATCH_BYTES,
    })

    ownerResults.forEach((res, i) => {
      if (res.status !== "success") return
      if ((res.result as Address).toLowerCase() === ownerLower) {
        ownedIds.push(slice[i]!)
      }
    })
  }

  if (ownedIds.length === 0) return []

  // 第二步：读属性 —— 大户持有上百 NFT 时同样分段，避免 meta multicall 并行风暴
  const metaRows: [number, number][] = []
  for (let offset = 0; offset < ownedIds.length; offset += OWNER_OF_SLICE) {
    const slice = ownedIds.slice(offset, offset + OWNER_OF_SLICE)
    const part = await client.multicall({
      contracts: slice.map((tokenId) => ({
        address: CONTRACTS.CharacterNFT,
        abi: ABIS.CharacterNFT,
        functionName: "characters" as const,
        args: [tokenId] as const,
      })),
      allowFailure: true,
      batchSize: OWNER_MULTICALL_BATCH_BYTES,
    })
    for (let i = 0; i < part.length; i++) {
      const row = part[i]!
      const tokenId = slice[i]!
      if (row.status !== "success" || row.result == null) {
        console.warn(
          `[reads] characters(${tokenId}) multicall 未成功，使用 level=0 power=0`,
          row.status === "failure" ? row.error : row,
        )
        metaRows.push([0, 0])
        continue
      }
      const r = row.result as unknown
      let level: number
      let power: number
      if (Array.isArray(r)) {
        level = Number(r[0])
        power = Number(r[1])
      } else if (
        r &&
        typeof r === "object" &&
        "level" in r &&
        "power" in r
      ) {
        level = Number((r as { level: bigint | number }).level)
        power = Number((r as { power: bigint | number }).power)
      } else {
        console.warn(`[reads] characters(${tokenId}) 未知返回值格式`, row.result)
        metaRows.push([0, 0])
        continue
      }
      if (!Number.isFinite(level) || !Number.isFinite(power)) {
        console.warn(`[reads] characters(${tokenId}) 解析异常，使用 0`, row.result)
        metaRows.push([0, 0])
        continue
      }
      metaRows.push([level, power])
    }
  }

  return ownedIds.map((tokenId, i) => {
    const tuple = metaRows[i]!
    return { tokenId, level: tuple[0], power: tuple[1] }
  })
}

// ─── 推荐团队统计（基于 ReferrerBound 事件重建） ─────────────────

const REFERRER_BOUND_EVENT = parseAbiItem(
  "event ReferrerBound(address indexed user, address indexed referrer)",
)

/**
 * 推荐事件扫描专用的 RPC fallback 池。
 *
 * 关键：bsc-dataseed.binance.org / bsc-dataseed1.binance.org 这类"官方主域名"
 * 对 eth_getLogs 限制非常严（≤1024 块），因此**完全跳过它们**，直接用
 * 限制更宽松的免费聚合节点：
 *   - bsc.nodereal.io           : NodeReal 公共端点，配额充足、首选
 *   - rpc.ankr.com/bsc          : Ankr，通常允许 10k+ 块、稳定
 *   - binance.llamarpc.com      : LlamaRPC，跨节点路由，块限制宽
 *   - bsc.drpc.org              : drpc 公开端点
 *   - bsc.publicnode.com        : 备用
 */
const FALLBACK_LOG_RPCS = [
  "https://bsc.nodereal.io",
  "https://rpc.ankr.com/bsc",
  "https://binance.llamarpc.com",
  "https://bsc.drpc.org",
  "https://bsc.publicnode.com",
  "https://bsc-rpc.publicnode.com",
  "https://1rpc.io/bnb",
]

/**
 * 单次窗口大小。Ankr/LlamaRPC/drpc 都能轻松吃下 ≥5000 块；
 * 我们直接走 5000 块，命中限制时二分到最小 200 块。
 */
const REF_LOG_CHUNK_INIT = 5_000n
const REF_LOG_CHUNK_MIN = 200n

/**
 * `readReferralTeamStats` 走事件回退时，`scanReferrerBoundChunked` 会把多年区间的日志
 * 全部攒进一个数组；若误触发海量区块扫描或热点地址事件极多，会直接把浏览器 / Node 堆打满。
 * 超过上限即中止并抛错，由上层退回 ZERO_STATS。
 */
const MAX_REFERRER_BOUND_LOGS = 40_000

/** 给每个 fallback RPC 缓存一个独立的 viem PublicClient */
const fallbackClients = new Map<string, ReturnType<typeof createPublicClient>>()
function getFallbackClient(url: string) {
  let c = fallbackClients.get(url)
  if (!c) {
    c = createPublicClient({
      transport: http(url, { timeout: 20_000, retryCount: 0 }),
    })
    fallbackClients.set(url, c)
  }
  return c
}

/** 已解码的 ReferrerBound 事件日志（保留 args.user / args.referrer） */
type ReferrerBoundLog = {
  args: { user?: Address; referrer?: Address }
  blockNumber: bigint | null
  logIndex: number | null
}

/**
 * 单次窗口查询：依次尝试 fallback RPC 池，任一成功即返回。
 * 所有 RPC 都失败时抛出最后一次错误（由上层 chunk loop 处理：二分缩小再试）。
 */
async function getReferrerBoundLogs(opts: {
  referrer: Address | Address[]
  fromBlock: bigint
  toBlock: bigint
}): Promise<ReferrerBoundLog[]> {
  const queryArgs = {
    address: CONTRACTS.ReferralRegistry,
    event: REFERRER_BOUND_EVENT,
    args: { referrer: opts.referrer },
    fromBlock: opts.fromBlock,
    toBlock: opts.toBlock,
  } as const

  let lastErr: unknown = null
  for (const url of FALLBACK_LOG_RPCS) {
    try {
      const c = getFallbackClient(url)
      const logs = await c.getLogs(queryArgs)
      return logs as unknown as ReferrerBoundLog[]
    } catch (err) {
      lastErr = err
      // 任意 RPC 失败 → 试下一个
    }
  }
  throw lastErr ?? new Error("所有 RPC 端点均无法响应 eth_getLogs")
}

async function scanReferrerBoundChunked(
  referrer: Address | Address[],
  fromBlock: bigint,
  latest: bigint,
): Promise<ReferrerBoundLog[]> {
  const out: ReferrerBoundLog[] = []
  let cursor = fromBlock
  let chunk = REF_LOG_CHUNK_INIT
  while (cursor <= latest) {
    const end = cursor + chunk - 1n > latest ? latest : cursor + chunk - 1n
    try {
      const logs = await getReferrerBoundLogs({
        referrer,
        fromBlock: cursor,
        toBlock: end,
      })
      out.push(...logs)
      if (out.length > MAX_REFERRER_BOUND_LOGS) {
        console.warn(
          `[referral] ReferrerBound 日志超过上限 ${MAX_REFERRER_BOUND_LOGS}，中止扫描以防内存溢出`,
        )
        throw new Error("ReferrerBoundLogScanExceededCap")
      }
      cursor = end + 1n
      // 成功后慢慢恢复 chunk，避免一次失败永久卡在最小窗口
      if (chunk < REF_LOG_CHUNK_INIT) {
        chunk = chunk * 2n > REF_LOG_CHUNK_INIT ? REF_LOG_CHUNK_INIT : chunk * 2n
      }
    } catch (err) {
      if (chunk > REF_LOG_CHUNK_MIN) {
        // 全部 RPC 都拒绝时二分缩小窗口重试同一段
        chunk = chunk / 2n < REF_LOG_CHUNK_MIN ? REF_LOG_CHUNK_MIN : chunk / 2n
        continue
      }
      throw err
    }
  }
  return out
}

export type ReferralTeamStats = {
  /** 直推（一级）地址列表 */
  directs: Address[]
  /** 直推总数 */
  directCount: number
  /** 间推（二级）总数 — 一级下属的所有地址去重后总数 */
  indirectCount: number
  /** 团队总人数 = directCount + indirectCount */
  teamCount: number
  /**
   * 数据是否来自成功的链上扫描。
   * `false` 表示扫描失败（RPC 全挂）— 此时数字会回退到 0，UI 可据此提示。
   */
  fresh: boolean
}

const ZERO_STATS: ReferralTeamStats = {
  directs: [],
  directCount: 0,
  indirectCount: 0,
  teamCount: 0,
  fresh: false,
}

/**
 * 读取某地址的推荐团队结构。
 *
 * 优先：`ReferralRegistry.directCount` / `indirectCount`（一次 multicall，无 getLogs）。
 * 若链上合约较旧无此视图或调用失败：回退到扫 `ReferrerBound` 事件（原实现）。
 *
 * **不会抛错**：任何 RPC / 网络异常都会被吞掉并返回 `ZERO_STATS`（fresh=false），
 * 让 UI 显示 0 而不是错误状态。这是用户明确要求的兜底语义。
 */
export async function readReferralTeamStats(
  addr: Address,
  fromBlock: bigint = DEPLOY_BLOCK,
): Promise<ReferralTeamStats> {
  try {
    const client = getPublicClient()
    const reg = { address: CONTRACTS.ReferralRegistry, abi: ABIS.ReferralRegistry } as const

    const counterTry = await client
      .multicall({
        contracts: [
          { ...reg, functionName: "directCount", args: [addr] },
          { ...reg, functionName: "indirectCount", args: [addr] },
        ],
        allowFailure: true,
      })
      .catch(() => null)

    if (
      counterTry &&
      counterTry[0].status === "success" &&
      counterTry[1].status === "success"
    ) {
      const dc = counterTry[0].result as bigint
      const ic = counterTry[1].result as bigint
      const directCount = Number(dc)
      const indirectCount = Number(ic)
      return {
        directs: [],
        directCount,
        indirectCount,
        teamCount: directCount + indirectCount,
        fresh: true,
      }
    }

    const latest = await client.getBlockNumber().catch(() => null)
    if (latest === null) return ZERO_STATS

    // 一级
    let directLogs: ReferrerBoundLog[]
    try {
      directLogs = await scanReferrerBoundChunked(addr, fromBlock, latest)
    } catch (err) {
      console.warn("[referral] scan directs failed, falling back to 0", err)
      return ZERO_STATS
    }

    const directSet = new Set<string>()
    for (const log of directLogs) {
      const user = log.args.user as Address | undefined
      if (user && user !== zeroAddress) directSet.add(user.toLowerCase())
    }
    const directs = [...directSet].map((s) => s as Address)

    if (directs.length === 0) {
      return { directs: [], directCount: 0, indirectCount: 0, teamCount: 0, fresh: true }
    }

    // 二级：分批 OR 查询；任一批失败不影响其他批，最终返回已成功部分
    const BATCH = 50
    const indirectSet = new Set<string>()
    let indirectFresh = true
    for (let i = 0; i < directs.length; i += BATCH) {
      const slice = directs.slice(i, i + BATCH)
      try {
        const logs = await scanReferrerBoundChunked(slice, fromBlock, latest)
        for (const log of logs) {
          const user = log.args.user as Address | undefined
          if (!user || user === zeroAddress) continue
          const lower = user.toLowerCase()
          if (directSet.has(lower)) continue
          indirectSet.add(lower)
        }
      } catch (err) {
        console.warn(
          `[referral] scan indirects batch ${i}-${i + BATCH} failed`,
          err,
        )
        indirectFresh = false
      }
    }

    return {
      directs,
      directCount: directs.length,
      indirectCount: indirectSet.size,
      teamCount: directs.length + indirectSet.size,
      fresh: indirectFresh,
    }
  } catch (err) {
    console.warn("[referral] readReferralTeamStats unexpected error", err)
    return ZERO_STATS
  }
}

// ─── 市场订单分页 ───────────────────────────────────────────────

export type ChainOrder = {
  orderId: bigint
  seller: Address
  materialId: bigint
  pricePerUnit: bigint
  remaining: bigint
  active: boolean
}

/** 市场列表默认只展示「最新的」这么多条活跃单（减轻 RPC / 渲染；翻页需后续接 cursor） */
export const MARKET_ACTIVE_ORDER_LIMIT = 10

/**
 * `getOrderPage` 合约参数 `maxScan`：单次调用最多检查多少个 orderId 槽位。
 * 链上若有大量历史单且大量已撤/成交，槽位很稀时，预算过小会凑不齐 `limit` 条活跃单。
 */
export function getOrderPageScanBudget(limit: number): bigint {
  const linear = limit * 100
  const capped = Math.min(Math.max(linear, 500), 12_000)
  return BigInt(capped)
}

export type MarketOrderPage = {
  nextCursor: bigint
  orders: ChainOrder[]
}

function chainOrderFromTuple(
  orderId: bigint,
  o: {
    seller: Address
    materialId: bigint
    pricePerUnit: bigint
    remaining: bigint
    active: boolean
  },
): ChainOrder | null {
  if (!o.active || o.seller === zeroAddress || o.remaining <= 0n) return null
  return {
    orderId,
    seller: o.seller,
    materialId: o.materialId,
    pricePerUnit: o.pricePerUnit,
    remaining: o.remaining,
    active: o.active,
  }
}

/**
 * 市场分页：优先 `getOrderPage`；旧部署无此 view 时回退为 `nextOrderId` 反向扫描 + `orders` multicall。
 *
 * @param cursor `0n` 表示从最新单开始；否则从 `cursor` 继续向后翻（与合约一致）
 * @param limit 本页最多返回多少条**匹配**的活跃单
 * @param materialId `0n` 表示全部材料
 * @param maxScanBudget 传给合约的 `maxScan`（控制单次 eth_call 计算量）
 */
export async function readMarketOrderPage(
  cursor: bigint = 0n,
  limit: number = MARKET_ACTIVE_ORDER_LIMIT,
  materialId: bigint = 0n,
  maxScanBudget: bigint = getOrderPageScanBudget(limit),
): Promise<MarketOrderPage> {
  const client = getPublicClient()
  const market = { address: CONTRACTS.Marketplace, abi: ABIS.Marketplace } as const
  const lim = BigInt(Math.max(0, limit))

  try {
    const page = await client.readContract({
      ...market,
      functionName: "getOrderPage",
      args: [cursor, lim, materialId, true, maxScanBudget],
    })
    const [nextCursor, ids, tuples] = page as readonly [
      bigint,
      readonly bigint[],
      readonly {
        seller: Address
        materialId: bigint
        pricePerUnit: bigint
        remaining: bigint
        active: boolean
      }[],
    ]
    const orders: ChainOrder[] = []
    for (let i = 0; i < ids.length; i++) {
      const orderId = ids[i]
      const o = tuples[i]
      if (!o) continue
      const c = chainOrderFromTuple(orderId, o)
      if (c) orders.push(c)
    }
    return { nextCursor, orders }
  } catch {
    // 旧版 Marketplace 无 getOrderPage 时回退
  }

  const next = (await client.readContract({
    ...market,
    functionName: "nextOrderId",
  })) as bigint
  if (next === 0n) return { nextCursor: 0n, orders: [] }

  const start = cursor === 0n ? next - 1n : cursor
  if (start === 0n) return { nextCursor: 0n, orders: [] }

  const scanCap = Number(maxScanBudget > 0n ? maxScanBudget : 200n)
  const want = Math.max(0, limit)
  const orders: ChainOrder[] = []

  let id = start
  let scanned = 0
  const BATCH = 64

  while (id > 0n && orders.length < want && scanned < scanCap) {
    const batchIds: bigint[] = []
    while (id > 0n && batchIds.length < BATCH && scanned < scanCap) {
      batchIds.push(id)
      scanned++
      id--
    }
    if (batchIds.length === 0) break

    const raw = await client.multicall({
      contracts: batchIds.map((orderId) => ({
        ...market,
        functionName: "orders" as const,
        args: [orderId] as const,
      })),
      allowFailure: false,
    })

    for (let i = 0; i < batchIds.length && orders.length < want; i++) {
      const orderId = batchIds[i]
      const t = raw[i] as readonly [Address, bigint, bigint, bigint, boolean]
      const c = chainOrderFromTuple(orderId, {
        seller: t[0],
        materialId: t[1],
        pricePerUnit: t[2],
        remaining: t[3],
        active: t[4],
      })
      if (!c) continue
      if (materialId !== 0n && c.materialId !== materialId) continue
      orders.push(c)
    }
  }

  return { nextCursor: id, orders }
}

/** 单笔订单读取 —— 买单 / 校验缓存未命中时使用（单次 eth_call） */
export async function readMarketOrder(orderId: bigint): Promise<ChainOrder | null> {
  const client = getPublicClient()
  const market = { address: CONTRACTS.Marketplace, abi: ABIS.Marketplace } as const
  const t = (await client.readContract({
    ...market,
    functionName: "orders",
    args: [orderId],
  })) as readonly [Address, bigint, bigint, bigint, boolean]
  const c = chainOrderFromTuple(orderId, {
    seller: t[0],
    materialId: t[1],
    pricePerUnit: t[2],
    remaining: t[3],
    active: t[4],
  })
  return c
}

/**
 * 拉取一页活跃卖单（默认从最新开始）。
 * @param limit 本页条数（传给 `getOrderPage` 的 `limit`）
 * @param materialId 材料筛选：`0n` 表示全部；否则为链上 `materialId`（1–4 等）
 */
export async function readActiveOrders(
  limit = MARKET_ACTIVE_ORDER_LIMIT,
  materialId: bigint = 0n,
): Promise<ChainOrder[]> {
  const { orders } = await readMarketOrderPage(0n, limit, materialId)
  return orders
}

// ─── 副本奖励 / 合成成本 / 战力区间（pure 函数，仅缓存读取） ─────

export type DungeonReward = { ae: bigint; bf: bigint; mr: bigint; es: bigint }
export type SynthesisCost = {
  ae: bigint
  bf: bigint
  mr: bigint
  es: bigint
  burnAdvent: bigint
}

const _dungeonCache: Map<number, DungeonReward> = new Map()
const _synthCache: Map<number, SynthesisCost> = new Map()
const _powerCache: Map<number, [number, number]> = new Map()
const _requiredPowerCache: Map<number, bigint> = new Map()

export async function readDungeonReward(level: number): Promise<DungeonReward> {
  const cached = _dungeonCache.get(level)
  if (cached) return cached
  const client = getPublicClient()
  const r = (await client.readContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "dungeonRewards",
    args: [level],
  })) as readonly [bigint, bigint, bigint, bigint]
  const reward = { ae: r[0], bf: r[1], mr: r[2], es: r[3] }
  _dungeonCache.set(level, reward)
  return reward
}

export async function readRequiredPower(level: number): Promise<bigint> {
  const cached = _requiredPowerCache.get(level)
  if (cached !== undefined) return cached
  const client = getPublicClient()
  const r = (await client.readContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "requiredPower",
    args: [level],
  })) as bigint
  _requiredPowerCache.set(level, r)
  return r
}

export async function readSynthesisCost(targetLevel: number): Promise<SynthesisCost> {
  const cached = _synthCache.get(targetLevel)
  if (cached) return cached
  const client = getPublicClient()
  const r = (await client.readContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "synthesisCost",
    args: [targetLevel],
  })) as readonly [bigint, bigint, bigint, bigint, bigint]
  const cost = { ae: r[0], bf: r[1], mr: r[2], es: r[3], burnAdvent: r[4] }
  _synthCache.set(targetLevel, cost)
  return cost
}

export async function readPowerRange(level: number): Promise<[number, number]> {
  const cached = _powerCache.get(level)
  if (cached) return cached
  const client = getPublicClient()
  const r = (await client.readContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "powerRange",
    args: [level],
  })) as readonly [number, number]
  const range: [number, number] = [r[0], r[1]]
  _powerCache.set(level, range)
  return range
}
