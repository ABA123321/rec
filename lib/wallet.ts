/**
 * 极简 EIP-1193 钱包适配器（MetaMask / OKX / Trust / Bitget 等所有注入式钱包通用）。
 * 不引入 wagmi/viem 等重型依赖；仅当浏览器存在 window.ethereum 时启用真实链上连接，
 * 否则上层会回退到演示用 mock 地址，不影响 demo 体验。
 */

export const BSC_CHAIN_ID_HEX = "0x38" // 56
export const BSC_CHAIN_ID_DEC = 56

const BSC_PARAMS = {
  chainId: BSC_CHAIN_ID_HEX,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc.nodereal.io"],
  blockExplorerUrls: ["https://bscscan.com"],
}

export type Eip1193Provider = {
  isMetaMask?: boolean
  isOkxWallet?: boolean
  isTrust?: boolean
  isCoinbaseWallet?: boolean
  isBitKeep?: boolean
  request: <T = unknown>(args: { method: string; params?: unknown[] | object }) => Promise<T>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] }
  }
}

/** 选出最佳 provider — 同时安装多个钱包时优先 MetaMask，再 OKX，再随便挑一个 */
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null
  const eth = window.ethereum
  if (!eth) return null
  if (eth.providers && eth.providers.length > 0) {
    return (
      eth.providers.find((p) => p.isMetaMask) ||
      eth.providers.find((p) => p.isOkxWallet) ||
      eth.providers[0]
    )
  }
  return eth
}

export function getWalletKind(p: Eip1193Provider | null): string {
  if (!p) return "Browser Wallet"
  if (p.isMetaMask) return "MetaMask"
  if (p.isOkxWallet) return "OKX Wallet"
  if (p.isTrust) return "Trust Wallet"
  if (p.isCoinbaseWallet) return "Coinbase Wallet"
  if (p.isBitKeep) return "Bitget Wallet"
  return "Browser Wallet"
}

export function shortenAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return ""
  if (addr.length <= head + tail + 2) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

export async function ensureBscNetwork(p: Eip1193Provider): Promise<void> {
  const current = (await p.request<string>({ method: "eth_chainId" })).toLowerCase()
  if (current === BSC_CHAIN_ID_HEX) return
  try {
    await p.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID_HEX }],
    })
  } catch (err) {
    // 4902: Unrecognized chain — 主动添加
    const code = (err as { code?: number })?.code
    if (code === 4902) {
      await p.request({
        method: "wallet_addEthereumChain",
        params: [BSC_PARAMS],
      })
    } else {
      throw err
    }
  }
}

export async function requestAccounts(p: Eip1193Provider): Promise<string[]> {
  const accounts = await p.request<string[]>({ method: "eth_requestAccounts" })
  return accounts ?? []
}

export async function getCurrentChainIdHex(p: Eip1193Provider): Promise<string> {
  return (await p.request<string>({ method: "eth_chainId" })).toLowerCase()
}
