import { CLASS_NAMES } from "@/lib/game-data"
import type { Character } from "@/components/providers/game-provider"

/** UI mirror of GameAdminConfig._initClassAffinityDefaults — home dungeon bonus bps per class index 0..5 */
export const CLASS_HOME_DUNGEON: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
}

export const CLASS_HOME_BONUS_BPS: Record<number, number> = {
  0: 500,
  1: 500,
  2: 500,
  3: 500,
  4: 300,
  5: 300,
}

/** Sum class material bonus bps for a team at a dungeon (matches on-chain stacking). */
export function teamClassBonusBps(members: Character[], dungeonLevel: number): number {
  let total = 0
  for (const m of members) {
    const ci = m.classIndex % CLASS_NAMES.length
    if (CLASS_HOME_DUNGEON[ci] === dungeonLevel) {
      total += CLASS_HOME_BONUS_BPS[ci] ?? 0
    }
  }
  return total
}

export function formatBonusPct(bps: number): string {
  if (bps <= 0) return ""
  return `+${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`
}
