/**
 * viem 客户端工厂。
 *
 * 只读 publicClient 走 `NEXT_PUBLIC_RPC_URL` 单一 HTTP JSON-RPC 端点
 * （BNB 公共节点配额按 IP 计，多节点 fallback 反而放大压力）。
 *
 * walletClient 通过 EIP-1193 注入钱包 (`window.ethereum`) 路由签名请求。
 */
import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Chain,
  type WalletClient,
} from "viem"
import { bsc, bscTestnet } from "viem/chains"

import { getInjectedProvider } from "@/lib/wallet"

import { CHAIN_ID } from "./contracts"

/** 默认 RPC（开发态 fallback）
 * 56 主网默认走 NodeReal — 公共端点配额充足、对 eth_getLogs 也友好。
 */
const DEFAULT_RPC: Record<number, string> = {
  56: "https://bsc.nodereal.io",
  97: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
}

/** 环境变量覆盖；只取第一个 URL（逗号分隔时其余被忽略） */
function getRpcUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_RPC_URL ?? "").trim()
  const first = raw.split(",")[0]?.trim()
  if (first) return first
  return DEFAULT_RPC[CHAIN_ID] ?? DEFAULT_RPC[56]!
}

/** 当链 ID 不是 viem 内置时，本地 defineChain */
function getChain(): Chain {
  if (CHAIN_ID === 56) return bsc
  if (CHAIN_ID === 97) return bscTestnet
  return defineChain({
    id: CHAIN_ID,
    name: `Chain ${CHAIN_ID}`,
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: { default: { http: [getRpcUrl()] } },
  })
}

/** 单例 publicClient */
let _publicClient: ReturnType<typeof createPublicClient> | null = null
export function getPublicClient() {
  if (_publicClient) return _publicClient
  _publicClient = createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl(), { timeout: 15_000, retryCount: 2 }),
    batch: { multicall: true },
  })
  return _publicClient
}

/** 注入钱包客户端；浏览器无钱包 / SSR 时返回 null */
export function getWalletClient(account?: Address): WalletClient | null {
  const provider = getInjectedProvider()
  if (!provider) return null
  return createWalletClient({
    chain: getChain(),
    account,
    transport: custom(provider as never),
  })
}

/** 暴露给 wallet helper：用于 wallet_switchEthereumChain 的链 hex */
export const CHAIN_ID_HEX = ("0x" + CHAIN_ID.toString(16)) as `0x${string}`
