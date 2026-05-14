/**
 * Commit-reveal 用的 32 字节 salt 管理。
 *
 * 流程：
 *   1. requestDrawWithCommit / requestSynthesizeWithCommit 之前 — 调用 makeSalt() 生成
 *      并 persistSalt() 落盘到 localStorage（防刷新丢失）。
 *   2. 落链 commit = solidityPackedKeccak256(["address","bytes32"], [user, salt]) — 用 buildCommit() 计算。
 *   3. finalizeDrawWithSalt / finalizeSynthesizeWithSalt — 用 readSalt() 取回原 salt。
 *   4. 完成或取消后 — clearSalt() 清空。
 */
import { type Address, type Hex, encodePacked, keccak256, toHex } from "viem"

export type SaltKind = "draw" | "synthesis"

const KEY = (kind: SaltKind, user: Address) =>
  `advent.salt.${kind}.${user.toLowerCase()}`

/** 生成新的 32 字节随机 salt — 浏览器原生 crypto.getRandomValues */
export function makeSalt(): Hex {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    throw new Error("Secure RNG unavailable")
  }
  const bytes = new Uint8Array(32)
  window.crypto.getRandomValues(bytes)
  return toHex(bytes)
}

export function persistSalt(kind: SaltKind, user: Address, salt: Hex): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY(kind, user), salt)
  } catch {
    /* storage disabled — 用户取消 finalize 时会丢，调用方需要兜底 */
  }
}

export function readSalt(kind: SaltKind, user: Address): Hex | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.localStorage.getItem(KEY(kind, user))
    return v as Hex | null
  } catch {
    return null
  }
}

export function clearSalt(kind: SaltKind, user: Address): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(KEY(kind, user))
  } catch {
    /* noop */
  }
}

/** seedCommit = keccak256(abi.encodePacked(user, salt)) — 与合约一致 */
export function buildCommit(user: Address, salt: Hex): Hex {
  return keccak256(encodePacked(["address", "bytes32"], [user, salt]))
}
