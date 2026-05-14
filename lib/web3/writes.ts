/**
 * 链上写入交易统一封装。
 *
 * 关键设计：
 *   1. 所有 write 都先 ensure*Allowance —— 缺额时申请 max uint256。
 *   2. 抽卡 / 合成走 commit-reveal 双阶段：
 *        request*WithCommit(... seedCommit)  → 等 ≥ RNG_DELAY_BLOCKS → finalize*WithSalt(salt)
 *      Salt 由调用方传入（GameProvider 已通过 lib/web3/salt 模块管理 localStorage 持久化）。
 *   3. 抽卡 / 合成扣 ADVENT，不是 USDT。Stamina.buy / Marketplace.buy 才扣 USDT。
 *   4. 撤单使用 cancelOrderEvenIfPaused — 即使合约暂停，玩家依然能拿回托管材料。
 */
import {
  type Address,
  type Hash,
  type Hex,
  maxUint256,
  parseEventLogs,
  type WalletClient,
} from "viem"

import { getPublicClient } from "./client"
import {
  ABIS,
  CHAIN_ID,
  CONTRACTS,
  ERC20_ABI,
  MATERIAL_IDS,
  MATERIAL_UNIT,
  type MaterialKey,
} from "./contracts"

/** viem 写入需要传 chain 对象；这里直接读 PublicClient 的 chain 即可 */
function chain() {
  return getPublicClient().chain
}

/** 等回执，超时 60s */
async function waitTx(hash: Hash) {
  const pc = getPublicClient()
  return pc.waitForTransactionReceipt({ hash, timeout: 60_000 })
}

/** ERC20 授权（额度不足时申请 max uint256） */
async function ensureErc20Allowance(
  token: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
  walletClient: WalletClient,
): Promise<void> {
  if (amount === 0n) return
  const pc = getPublicClient()
  const allowance = (await pc.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint
  if (allowance >= amount) return
  const hash = await walletClient.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, maxUint256],
    chain: chain(),
    account: owner,
  })
  await waitTx(hash)
}

/** ERC1155 setApprovalForAll */
async function ensureErc1155Approval(
  owner: Address,
  spender: Address,
  walletClient: WalletClient,
): Promise<void> {
  const pc = getPublicClient()
  const approved = (await pc.readContract({
    address: CONTRACTS.Materials,
    abi: ABIS.Materials,
    functionName: "isApprovedForAll",
    args: [owner, spender],
  })) as boolean
  if (approved) return
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Materials,
    abi: ABIS.Materials,
    functionName: "setApprovalForAll",
    args: [spender, true],
    chain: chain(),
    account: owner,
  })
  await waitTx(hash)
}

// ─── Stamina ────────────────────────────────────────────────────

export async function txClaimNewbieGift(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Stamina,
    abi: ABIS.Stamina,
    functionName: "claimNewbieGift",
    args: [],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txBuyStamina(
  account: Address,
  walletClient: WalletClient,
  points: bigint,
  pricePerPoint: bigint,
): Promise<Hash> {
  const totalCost = points * pricePerPoint
  await ensureErc20Allowance(
    CONTRACTS.USDT,
    account,
    CONTRACTS.Stamina,
    totalCost,
    walletClient,
  )
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Stamina,
    abi: ABIS.Stamina,
    functionName: "buy",
    args: [points],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

// ─── ReferralRegistry ────────────────────────────────────────────

export async function txBindReferrer(
  account: Address,
  walletClient: WalletClient,
  referrer: Address,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.ReferralRegistry,
    abi: ABIS.ReferralRegistry,
    functionName: "bindReferrer",
    args: [referrer],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

// ─── 显式授权（供 UI "先授权后召唤" 流程调用） ─────────────────

/**
 * 单纯地把 ADVENT 授权给 Game 合约（max uint256），不附带任何业务逻辑。
 * 一次签名即可，后续抽卡 / 合成都不会再弹 approve。
 */
export async function txApproveAdventForGame(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.AdventToken,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACTS.Game, maxUint256],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/**
 * 把 USDT 授权给 Stamina 合约（max uint256）。供"先授权后购买体力"两步流程调用。
 */
export async function txApproveUsdtForStamina(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.USDT,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACTS.Stamina, maxUint256],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/**
 * 把 USDT 授权给 Marketplace 合约（max uint256）。供"先授权后买单"两步流程调用。
 * 一次签名后任意金额的内盘买单都不会再弹 approve。
 */
export async function txApproveUsdtForMarketplace(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.USDT,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACTS.Marketplace, maxUint256],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/**
 * 把材料 ERC1155 setApprovalForAll(Marketplace, true)。供"先授权后挂单"两步流程调用。
 * 一次签名后所有材料种类都通用 — 后续挂单 / 撤单不再弹窗。
 */
export async function txApproveMaterialsForMarketplace(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Materials,
    abi: ABIS.Materials,
    functionName: "setApprovalForAll",
    args: [CONTRACTS.Marketplace, true],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

// ─── Game：抽卡 commit-reveal ───────────────────────────────────

/**
 * 请求抽卡。需要先 approve ADVENT 给 Game（按当前价 × 数量预估 + 50% buffer 应对价格阶梯上涨）。
 *
 * @param seedCommit  keccak256(abi.encodePacked(account, salt))，由调用方提前算好
 * @param estimatedCost 当前 currentDrawPrice * count（链上 18 位精度）
 */
export async function txRequestDraw(
  account: Address,
  walletClient: WalletClient,
  count: number,
  seedCommit: Hex,
  estimatedCost: bigint,
): Promise<Hash> {
  const buffer = estimatedCost + estimatedCost / 2n
  await ensureErc20Allowance(
    CONTRACTS.AdventToken,
    account,
    CONTRACTS.Game,
    buffer,
    walletClient,
  )
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "requestDrawWithCommit",
    args: [BigInt(count), seedCommit],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txFinalizeDraw(
  account: Address,
  walletClient: WalletClient,
  salt: Hex,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "finalizeDrawWithSalt",
    args: [salt],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txCancelDraw(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "cancelDraw",
    args: [],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

// ─── Game：合成 commit-reveal ───────────────────────────────────

export async function txRequestSynthesize(
  account: Address,
  walletClient: WalletClient,
  targetLevel: number,
  seedCommit: Hex,
): Promise<Hash> {
  // Materials 由 Game burn —— setApprovalForAll(Game,true)
  // ADVENT 由 Game burn —— ERC20 approve max
  await Promise.all([
    ensureErc1155Approval(account, CONTRACTS.Game, walletClient),
    ensureErc20Allowance(
      CONTRACTS.AdventToken,
      account,
      CONTRACTS.Game,
      maxUint256,
      walletClient,
    ),
  ])
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "requestSynthesizeWithCommit",
    args: [targetLevel, seedCommit],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txFinalizeSynthesize(
  account: Address,
  walletClient: WalletClient,
  salt: Hex,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "finalizeSynthesizeWithSalt",
    args: [salt],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txCancelSynthesize(
  account: Address,
  walletClient: WalletClient,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "cancelSynthesis",
    args: [],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

// ─── Game：组队 / 副本 ──────────────────────────────────────────

export async function txCreateTeam(
  account: Address,
  walletClient: WalletClient,
  characterIds: [bigint, bigint, bigint],
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "createTeam",
    args: [characterIds],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/**
 * 副本挑战交易结果。
 *
 * - hash: 交易哈希
 * - result: 解析自 `DungeonResult` 事件的真实战斗结果（成功/失败 + 实际掉落）。
 *   合约已经按"成功全掉、失败 1/4 取整"在事件里把 ae/bf/mr/es 直接写好，
 *   前端只负责展示动效与数字，不再需要前端推算。
 *   如果回执解析失败（不该发生），返回 `null` 让上层 fallback。
 *
 * 注意：链上单位是 0.1 — 这里返回的就是链上原值（uint256）；
 * UI 想展示"个数"时除以 MATERIAL_UNIT_NUM 即可，与库存口径一致。
 */
export interface ChallengeResult {
  success: boolean
  successBps: number
  dungeonLevel: number
  teamIndex: bigint
  /** 链上原值（0.1 单位）；展示时除以 10 */
  ae: bigint
  bf: bigint
  mr: bigint
  es: bigint
}

export async function txChallenge(
  account: Address,
  walletClient: WalletClient,
  teamIndex: number,
  dungeonLevel: number,
): Promise<{ hash: Hash; result: ChallengeResult | null }> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Game,
    abi: ABIS.Game,
    functionName: "challenge",
    args: [BigInt(teamIndex), dungeonLevel],
    chain: chain(),
    account,
  })
  const receipt = await waitTx(hash)

  // 解析 DungeonResult 事件 — 合约保证每次 challenge 必发一条
  let result: ChallengeResult | null = null
  try {
    const events = parseEventLogs({
      abi: ABIS.Game,
      eventName: "DungeonResult",
      logs: receipt.logs,
    }) as readonly {
      args: {
        user: Address
        dungeonLevel: bigint | number
        success: boolean
        successBps: bigint | number
        teamIndex: bigint
        ae: bigint
        bf: bigint
        mr: bigint
        es: bigint
      }
    }[]
    // 只取与当前调用者匹配的那条（同一区块可能有别人也挑战）
    const mine = events.find(
      (e) =>
        e.args.user.toLowerCase() === account.toLowerCase() &&
        Number(e.args.dungeonLevel) === dungeonLevel,
    )
    if (mine) {
      result = {
        success: mine.args.success,
        successBps: Number(mine.args.successBps),
        dungeonLevel: Number(mine.args.dungeonLevel),
        teamIndex: mine.args.teamIndex,
        ae: mine.args.ae,
        bf: mine.args.bf,
        mr: mine.args.mr,
        es: mine.args.es,
      }
    }
  } catch (err) {
    // 解析失败不影响主流程 — 前端会 fallback 到"成功 + 副本默认掉落"
    console.warn("[v0] failed to parse DungeonResult", err)
  }

  return { hash, result }
}

// ─── Marketplace ────────────────────────────────────────────────

/**
 * 创建挂单。amount 由调用方按 0.1 单位精度传入（已乘 MATERIAL_UNIT），
 * 或者传整数 N 时由 GameProvider 在外层乘 MATERIAL_UNIT。这里假定上层已转换。
 */
export async function txCreateOrder(
  account: Address,
  walletClient: WalletClient,
  materialKey: MaterialKey,
  amountChainUnits: bigint,
  pricePerUnit: bigint,
): Promise<Hash> {
  await ensureErc1155Approval(account, CONTRACTS.Marketplace, walletClient)
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Marketplace,
    abi: ABIS.Marketplace,
    functionName: "createOrder",
    args: [MATERIAL_IDS[materialKey], amountChainUnits, pricePerUnit],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

export async function txBuyOrder(
  account: Address,
  walletClient: WalletClient,
  orderId: bigint,
  amountChainUnits: bigint,
  totalCost: bigint,
): Promise<Hash> {
  await ensureErc20Allowance(
    CONTRACTS.USDT,
    account,
    CONTRACTS.Marketplace,
    totalCost,
    walletClient,
  )
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Marketplace,
    abi: ABIS.Marketplace,
    functionName: "buy",
    args: [orderId, amountChainUnits],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/** 撤单 — 使用 cancelOrderEvenIfPaused，确保 Marketplace 暂停时玩家也能取回托管材料 */
export async function txCancelOrder(
  account: Address,
  walletClient: WalletClient,
  orderId: bigint,
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: CONTRACTS.Marketplace,
    abi: ABIS.Marketplace,
    functionName: "cancelOrderEvenIfPaused",
    args: [orderId],
    chain: chain(),
    account,
  })
  await waitTx(hash)
  return hash
}

/** 暴露给 UI 用以判断是否在 BSC 主网 */
export const TARGET_CHAIN_ID = CHAIN_ID
/** 兼容旧 import：保留 MATERIAL_UNIT 导出 */
export { MATERIAL_UNIT }
