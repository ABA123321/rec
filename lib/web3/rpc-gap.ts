/**
 * BNB Smart Chain public JSON-RPC endpoints document a quota of **10,000 requests per 5 minutes**
 * for Mainnet and Testnet (per endpoint / IP — see BNB Chain docs).
 *
 * We throttle bursty read patterns (especially sequential `eth_call` scans and `eth_getLogs` chunks)
 * so a single-tab dApp stays well under sustained averages.
 *
 * @see https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/
 */

/** Default pause between sequential RPC batches (ms). */
export const RPC_BATCH_GAP_MS = 120

export async function rpcSleep(ms: number = RPC_BATCH_GAP_MS): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}
