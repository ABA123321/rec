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
import staminaAbi from "@/lib/abi/stamina.json"
import adventAbi from "@/lib/abi/advent-token.json"
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

/** 合约地址 */
export const CONTRACTS = {
  ReferralRegistry: envAddr(
    process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS,
    "0x9DC2C0fab8D0312c0ffb6d5275b0db48a11557df",
  ),
  Stamina: envAddr(
    process.env.NEXT_PUBLIC_STAMINA_ADDRESS,
    "0xEdDe1C8Be5a22042904411aC42D2a3914Bd4E2F6",
  ),
  AdventToken: envAddr(
    process.env.NEXT_PUBLIC_ADVENT_ADDRESS,
    "0x5E7E9E65FC1C8A92af104100B35B2ABF7C41A1c4",
  ),
  Materials: envAddr(
    process.env.NEXT_PUBLIC_MATERIALS_ADDRESS,
    "0xa398AE7E9546feDa47Cef042cFfeA5a173AAaeB8",
  ),
  CharacterNFT: envAddr(
    process.env.NEXT_PUBLIC_CHARACTER_NFT_ADDRESS,
    "0x2D81F99Dd0a4c72f5b3DbB3C556f601a00F666f8",
  ),
  Game: envAddr(
    process.env.NEXT_PUBLIC_GAME_ADDRESS,
    "0xf34C786BdEF2839282b25aaB9f1207114203AD6b",
  ),
  Marketplace: envAddr(
    process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
    "0x4e0134b26Ab08C21641CE1073c19Bc53c0f8C011",
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
  Stamina: staminaAbi as Abi,
  AdventToken: adventAbi as Abi,
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

/** 浏览器跳转助手 */
export const explorer = {
  tx: (hash: string) => `${EXPLORER_BASE}/tx/${hash}`,
  address: (addr: string) => `${EXPLORER_BASE}/address/${addr}`,
  block: (n: number | bigint) => `${EXPLORER_BASE}/block/${n}`,
}
