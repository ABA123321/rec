/**
 * 召唤单价 —— 链上 cached + DEX 现货预估。
 *
 * Game.currentDrawPrice() 读的是 Oracle 缓存价，只有有人调用 updateDrawPrice / draw 才会刷新。
 * UI 需要跟 Pancake 现货走，因此这里用 pair reserves 估算下一笔 draw 的 tier 价。
 */
import { type Address, parseAbi } from "viem"

import { ABIS, CONTRACTS } from "./contracts"
import { getPublicClient } from "./client"

const ZERO = "0x0000000000000000000000000000000000000000" as Address
const BPS = 10_000n
const WAD = 10n ** 18n

const DRAW_PRICE_ORACLE_ABI = parseAbi([
  "function cachedDrawPriceInAdvent() view returns (uint256)",
  "function baseDrawUsdtPrice() view returns (uint256)",
  "function adventWbnbPair() view returns (address)",
  "function wbnbUsdtPair() view returns (address)",
  "function adventToken() view returns (address)",
  "function maxPriceChangeBps() view returns (uint16)",
])

const PANCAKE_PAIR_ABI = parseAbi([
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
])

export type GlobalDrawEconomy = {
  drawnCount: bigint
  /** 链上 currentDrawPrice() — 结算缓存价 */
  onChainDrawPrice: bigint
  /** DEX 现货 + 阶梯 — UI 展示用 */
  displayDrawPrice: bigint
}

function tieredPrice(basePrice: bigint, drawnCount: bigint, step: bigint): bigint {
  if (basePrice === 0n || step === 0n) return basePrice
  const k = drawnCount / step
  let price = basePrice
  for (let i = 0n; i < k; i++) {
    price = (price * 110n) / 100n
  }
  return price
}

function spotTokenInOther(
  reserve0: bigint,
  reserve1: bigint,
  baseToken: Address,
  token0: Address,
): bigint {
  if (baseToken === token0) {
    if (reserve0 === 0n) return 0n
    return (reserve1 * WAD) / reserve0
  }
  if (reserve1 === 0n) return 0n
  return (reserve0 * WAD) / reserve1
}

function clampSpotCache(cached: bigint, newCached: bigint, maxBps: number): bigint {
  if (cached === 0n || maxBps === 0) return newCached
  const bps = BigInt(maxBps)
  const maxUp = (cached * (BPS + bps)) / BPS
  const maxDown = (cached * (BPS - bps)) / BPS
  if (newCached > maxUp) return maxUp
  if (newCached < maxDown) return maxDown
  return newCached
}

export async function readGlobalDrawEconomy(): Promise<GlobalDrawEconomy> {
  const client = getPublicClient()
  const game = { address: CONTRACTS.Game, abi: ABIS.Game } as const

  const gameRows = await client.multicall({
    contracts: [
      { ...game, functionName: "drawnCount" },
      { ...game, functionName: "currentDrawPrice" },
      { ...game, functionName: "drawPriceOracle" },
      { ...game, functionName: "drawPriceStep" },
    ],
    allowFailure: false,
  })

  const drawnCount = gameRows[0] as bigint
  const onChainDrawPrice = gameRows[1] as bigint
  const oracleAddr = gameRows[2] as Address
  const drawPriceStep = gameRows[3] as bigint

  if (oracleAddr === ZERO) {
    return { drawnCount, onChainDrawPrice, displayDrawPrice: onChainDrawPrice }
  }

  const oracle = { address: oracleAddr, abi: DRAW_PRICE_ORACLE_ABI } as const
  const oracleRows = await client.multicall({
    contracts: [
      { ...oracle, functionName: "cachedDrawPriceInAdvent" },
      { ...oracle, functionName: "baseDrawUsdtPrice" },
      { ...oracle, functionName: "adventWbnbPair" },
      { ...oracle, functionName: "wbnbUsdtPair" },
      { ...oracle, functionName: "adventToken" },
      { ...oracle, functionName: "maxPriceChangeBps" },
    ],
    allowFailure: true,
  })

  const cached =
    oracleRows[0].status === "success" ? (oracleRows[0].result as bigint) : 0n
  const baseUsdt =
    oracleRows[1].status === "success" ? (oracleRows[1].result as bigint) : 0n
  const adventWbnbPair =
    oracleRows[2].status === "success" ? (oracleRows[2].result as Address) : ZERO
  const wbnbUsdtPair =
    oracleRows[3].status === "success" ? (oracleRows[3].result as Address) : ZERO
  const adventToken =
    oracleRows[4].status === "success" ? (oracleRows[4].result as Address) : ZERO
  const maxBps =
    oracleRows[5].status === "success" ? Number(oracleRows[5].result) : 0

  let spotCached = cached

  if (
    baseUsdt > 0n &&
    adventWbnbPair !== ZERO &&
    wbnbUsdtPair !== ZERO &&
    adventToken !== ZERO
  ) {
    try {
      const pairRows = await client.multicall({
        contracts: [
          { address: adventWbnbPair, abi: PANCAKE_PAIR_ABI, functionName: "getReserves" },
          { address: adventWbnbPair, abi: PANCAKE_PAIR_ABI, functionName: "token0" },
          { address: adventWbnbPair, abi: PANCAKE_PAIR_ABI, functionName: "token1" },
          { address: wbnbUsdtPair, abi: PANCAKE_PAIR_ABI, functionName: "getReserves" },
          { address: wbnbUsdtPair, abi: PANCAKE_PAIR_ABI, functionName: "token0" },
        ],
        allowFailure: false,
      })

      const awRes = pairRows[0] as readonly [bigint, bigint, number]
      const awToken0 = pairRows[1] as Address
      const awToken1 = pairRows[2] as Address
      const wuRes = pairRows[3] as readonly [bigint, bigint, number]
      const wuToken0 = pairRows[4] as Address

      const adventInWbnb = spotTokenInOther(awRes[0], awRes[1], adventToken, awToken0)
      const wbnbToken = adventToken === awToken0 ? awToken1 : awToken0
      const wbnbInUsdt = spotTokenInOther(wuRes[0], wuRes[1], wbnbToken, wuToken0)

      if (adventInWbnb > 0n && wbnbInUsdt > 0n) {
        const adventInUsdt = (adventInWbnb * wbnbInUsdt) / WAD
        if (adventInUsdt > 0n) {
          const rawCached = (baseUsdt * WAD) / adventInUsdt
          if (rawCached > 0n) {
            spotCached = clampSpotCache(cached, rawCached, maxBps)
          }
        }
      }
    } catch (err) {
      console.warn("[draw-price] spot estimate failed, using cached:", err)
    }
  }

  const displayDrawPrice = tieredPrice(spotCached, drawnCount, drawPriceStep)
  return {
    drawnCount,
    onChainDrawPrice,
    displayDrawPrice: displayDrawPrice > 0n ? displayDrawPrice : onChainDrawPrice,
  }
}

/** 授权 / 估价取 UI 价与链上价较大者，避免现货高于缓存时授权不足 */
export function summonUnitPriceForTx(economy: GlobalDrawEconomy | null): bigint {
  if (!economy) return 0n
  return economy.displayDrawPrice > economy.onChainDrawPrice
    ? economy.displayDrawPrice
    : economy.onChainDrawPrice
}
