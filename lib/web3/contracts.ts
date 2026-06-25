/**
 * 链上合约地址、ABI 与常量集中导出。
 *
 * 地址来源（按优先级）：
 *   1. `NEXT_PUBLIC_*_ADDRESS` 环境变量（生产部署强制注入）
 *   2. 文件内默认值（fallback，便于本地启动）
 *
 * Next.js 客户端只对**静态书写**的 `process.env.NEXT_PUBLIC_*` 做打包内联，
 * 因此每个变量都显式列出 — 不要改成动态索引。
 */
import type { Abi, Address } from "viem"

import gameAbi from "@/lib/abi/game.json"
import gameProgressAbi from "@/lib/abi/game-progress.json"
import staminaAbi from "@/lib/abi/stamina.json"
import materialsAbi from "@/lib/abi/materials.json"
import characterNftAbi from "@/lib/abi/character-nft.json"
import referralAbi from "@/lib/abi/referral-registry.json"
import marketplaceAbi from "@/lib/abi/marketplace.json"

/** 链 ID — 默认 BSC 主网，可通过 NEXT_PUBLIC_CHAIN_ID 切换到测试网 97 等 */
export const CHAIN_ID: number = (() => {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID
  const n = raw ? Number(raw) : 56
  return Number.isFinite(n) ? n : 56
})()

/** BSCScan 浏览器（按链 ID 切换） */
export const EXPLORER_BASE = CHAIN_ID === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com"

/** 安全读取 NEXT_PUBLIC_* 地址 — 缺失时回退默认 */
function envAddr(envValue: string | undefined, fallback: Address): Address {
  return ((envValue ?? "").trim() || fallback) as Address
}

/** $草根社 代币合约（Flap 公平发射 · BSC 主网） */
const DEFAULT_ADVENT_TOKEN: Address = "0x45ee0ca7470076a45618b85f09a40c4135087777"

/** 合约地址 */
export const CONTRACTS = {
  ReferralRegistry: envAddr(
    process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS,
    "0xE15ff182bBB063D5b6a9264F0b3631e7fE3607E4",
  ),
  Stamina: envAddr(
    process.env.NEXT_PUBLIC_STAMINA_ADDRESS,
    "0xa5fC33Cf3cE04DafA073cE929926b324f09a0978",
  ),
  AdventToken: envAddr(
    process.env.NEXT_PUBLIC_ADVENT_ADDRESS,
    DEFAULT_ADVENT_TOKEN,
  ),
  Materials: envAddr(
    process.env.NEXT_PUBLIC_MATERIALS_ADDRESS,
    "0x300Bf0aD917e4516B04A0F0B37F183D8Ed3d7685",
  ),
  CharacterNFT: envAddr(
    process.env.NEXT_PUBLIC_CHARACTER_NFT_ADDRESS,
    "0xFeD3B521024Ad31496Fa6eB0a971F8179d495536",
  ),
  Game: envAddr(
    process.env.NEXT_PUBLIC_GAME_ADDRESS,
    "0x53f5a0177594700b7Fd52cAE6f8985edE3C817CA",
  ),
  GameProgress: envAddr(
    process.env.NEXT_PUBLIC_GAME_PROGRESS_ADDRESS,
    "0x71d625a9bD5A3cD5B4392eCD85a3632d9CAD9B85",
  ),
  Marketplace: envAddr(
    process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
    "0xCC9328D5C795aE4Fe95bd84DD21374c0ef20c1fC",
  ),
  USDT: envAddr(
    process.env.NEXT_PUBLIC_USDT_ADDRESS,
    "0x55d398326f99059fF775485246999027B3197955",
  ),
} as const

/** 最小 ERC20 ABI — 用于 USDT 等无验证 ABI 的标准代币 */
export const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi

/** 各业务合约 ABI（来自 Hardhat artifact，已纳入 lib/abi/*.json） */
export const ABIS = {
  Game: gameAbi as Abi,
  GameProgress: gameProgressAbi as Abi,
  Stamina: staminaAbi as Abi,
  GameToken: ERC20_ABI,
  Materials: materialsAbi as Abi,
  CharacterNFT: characterNftAbi as Abi,
  ReferralRegistry: referralAbi as Abi,
  Marketplace: marketplaceAbi as Abi,
} as const

/** Materials ERC1155 内部材料 ID（与合约视图常量 AE/BF/MR/ES 对应） */
export const MATERIAL_IDS = {
  AE: 1n,
  BF: 2n,
  MR: 3n,
  ES: 4n,
} as const
export const MATERIAL_KEY_LIST = ["AE", "BF", "MR", "ES"] as const
export type MaterialKey = (typeof MATERIAL_KEY_LIST)[number]

/**
 * 链上材料以 0.1 为最小单位 — 用户可见整数 N 个材料 = 链上 N*10 单位。
 *
 * 适用场景：
 *   - createOrder 的 amount 入参（×10）
 *   - buy 的 amount 入参（×10）
 *   - 所有 balanceOfBatch / synthesisCost 返回的数值除以 10 才是用户看到的整数
 */
export const MATERIAL_UNIT = 10n

/** $草根社 Flap 公平发射页（BSC） */
export const FLAP_FAIR_LAUNCH_URL = `https://flap.sh/bnb/${CONTRACTS.AdventToken}`

/** 浏览器跳转助手 */
export const explorer = {
  tx: (hash: string) => `${EXPLORER_BASE}/tx/${hash}`,
  address: (addr: string) => `${EXPLORER_BASE}/address/${addr}`,
  block: (n: number | bigint) => `${EXPLORER_BASE}/block/${n}`,
}
