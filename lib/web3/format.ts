/**
 * 链上数值格式化 —— BigInt → 人类可读字符串。
 * 所有数额在合约里都是 18 位（USDT BSC 也是 18 位）。
 */
import { formatUnits, parseUnits } from "viem"

const TOKEN_DECIMALS = 18

/** BigInt -> 字符串，默认保留 4 位小数并去除尾部 0 */
export function formatToken(amount: bigint | undefined, fractionDigits = 4): string {
  if (amount === undefined || amount === null) return "0"
  const raw = formatUnits(amount, TOKEN_DECIMALS)
  if (!raw.includes(".")) return raw
  const [intPart, fracPart] = raw.split(".")
  const trimmed = fracPart.slice(0, fractionDigits).replace(/0+$/, "")
  return trimmed ? `${intPart}.${trimmed}` : intPart
}

/** BigInt -> 数字（用于显示百分比 / 进度条等场景，会损精度，仅展示用） */
export function tokenToNumber(amount: bigint | undefined): number {
  if (!amount) return 0
  return Number(formatUnits(amount, TOKEN_DECIMALS))
}

/** 字符串 -> BigInt（用户输入金额转链上单位） */
export function parseToken(value: string | number): bigint {
  return parseUnits(String(value), TOKEN_DECIMALS)
}

/** 整数（材料数量等无小数） */
export function bigintToNumber(value: bigint | undefined, fallback = 0): number {
  if (!value && value !== 0n) return fallback
  // 材料数量一般 < Number.MAX_SAFE_INTEGER，安全转换
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
  return Number(value)
}
