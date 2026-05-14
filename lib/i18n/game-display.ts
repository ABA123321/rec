import type { Character } from "@/components/providers/game-provider"
import type { Messages } from "@/lib/i18n/dictionaries/zh"
import {
  CLASS_NAMES,
  DUNGEONS,
  RARITY_BY_LEVEL,
  type Dungeon,
} from "@/lib/game-data"

type GameMessages = Messages["game"]

type RarityDisplayRow = { name: string; short: string }
type DungeonDisplayRow = { name: string; bossName: string; description: string }

export function displayRarity(
  loc: GameMessages,
  rarity: Character["rarity"] | number,
): RarityDisplayRow {
  const rows = loc.display?.rarities as Record<string, RarityDisplayRow> | undefined
  const fromDict = rows?.[String(rarity)]
  if (fromDict) return fromDict
  const base = RARITY_BY_LEVEL[rarity as keyof typeof RARITY_BY_LEVEL]
  if (base) return { name: base.name, short: base.short }
  return { name: "—", short: "—" }
}

export function displayClass(loc: GameMessages, classIndex: number): string {
  const rows = loc.display?.classes as Record<string, string> | undefined
  const fromDict = rows?.[String(classIndex)]
  if (fromDict) return fromDict
  const names = CLASS_NAMES as readonly string[]
  const i = ((classIndex % names.length) + names.length) % names.length
  return names[i] ?? "—"
}

export function mergeLocalizedDungeon(
  loc: GameMessages,
  dungeon: Dungeon,
): DungeonDisplayRow {
  const rows = loc.display?.dungeons as Record<string, DungeonDisplayRow> | undefined
  const row = rows?.[String(dungeon.level)]
  if (row) {
    return {
      name: row.name,
      bossName: row.bossName,
      description: row.description,
    }
  }
  return {
    name: dungeon.name,
    bossName: dungeon.bossName,
    description: dungeon.description,
  }
}

export function displayDungeonRow(
  loc: GameMessages,
  level: number,
): DungeonDisplayRow {
  const dungeon = DUNGEONS.find((d) => d.level === level)
  if (!dungeon) {
    return { name: "—", bossName: "—", description: "" }
  }
  return mergeLocalizedDungeon(loc, dungeon)
}
