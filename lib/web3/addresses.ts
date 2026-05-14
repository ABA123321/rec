export type Web3Addresses = {
  usdt: string
  advent: string
  materials: string
  characterNft: string
  referralRegistry: string
  stamina: string
  marketplace: string
  game: string
}

export type Web3Config = {
  chainId: number
  rpcUrls: string[]
  deployBlock?: number
  addresses: Web3Addresses
}

/**
 * Next.js only inlines NEXT_PUBLIC_* env vars for *static* access
 * (process.env.NEXT_PUBLIC_FOO). Dynamic access (process.env[name])
 * will be undefined in the client bundle.
 */
function mustEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

function maybeNumber(v: string | undefined): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function getWeb3Config(): Web3Config {
  const chainId = Number(mustEnv(process.env.NEXT_PUBLIC_CHAIN_ID, "NEXT_PUBLIC_CHAIN_ID"))
  const rpcUrlRaw = mustEnv(process.env.NEXT_PUBLIC_RPC_URL, "NEXT_PUBLIC_RPC_URL")
  /** Prefer a single URL (comma-separated values use **first URL only** for reads — see `getReadProvider`). */
  const rpcUrls = rpcUrlRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const deployBlock = maybeNumber(process.env.NEXT_PUBLIC_DEPLOY_BLOCK)

  return {
    chainId,
    rpcUrls,
    deployBlock,
    addresses: {
      usdt: mustEnv(process.env.NEXT_PUBLIC_USDT_ADDRESS, "NEXT_PUBLIC_USDT_ADDRESS"),
      advent: mustEnv(process.env.NEXT_PUBLIC_ADVENT_ADDRESS, "NEXT_PUBLIC_ADVENT_ADDRESS"),
      materials: mustEnv(process.env.NEXT_PUBLIC_MATERIALS_ADDRESS, "NEXT_PUBLIC_MATERIALS_ADDRESS"),
      characterNft: mustEnv(process.env.NEXT_PUBLIC_CHARACTER_NFT_ADDRESS, "NEXT_PUBLIC_CHARACTER_NFT_ADDRESS"),
      referralRegistry: mustEnv(
        process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS,
        "NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS",
      ),
      stamina: mustEnv(process.env.NEXT_PUBLIC_STAMINA_ADDRESS, "NEXT_PUBLIC_STAMINA_ADDRESS"),
      marketplace: mustEnv(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS, "NEXT_PUBLIC_MARKETPLACE_ADDRESS"),
      game: mustEnv(process.env.NEXT_PUBLIC_GAME_ADDRESS, "NEXT_PUBLIC_GAME_ADDRESS"),
    },
  }
}

export function isWeb3Configured(): boolean {
  try {
    getWeb3Config()
    return true
  } catch {
    return false
  }
}

