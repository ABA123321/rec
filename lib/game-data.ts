// Rune Abyss — game design constants (V46.0 spec)
// 所有数值与系统设计文档保持一致

export type RarityLevel = 1 | 2 | 3 | 4 | 5
export type MaterialKey = "AE" | "BF" | "MR" | "ES"

export interface Rarity {
  level: RarityLevel
  name: string
  short: string
  powerMin: number
  powerMax: number
  prob: number
  /** Tailwind chart token (1-5) */
  tone: 1 | 2 | 3 | 4 | 5
  image: string
}

export const RARITIES: Rarity[] = [
  {
    level: 1,
    name: "见习冒险者",
    short: "见习",
    powerMin: 15,
    powerMax: 25,
    prob: 0.65,
    tone: 1,
    image: "/characters/r1-apprentice.jpg",
  },
  {
    level: 2,
    name: "熟练冒险者",
    short: "熟练",
    powerMin: 30,
    powerMax: 50,
    prob: 0.22,
    tone: 2,
    image: "/characters/r2-adept.jpg",
  },
  {
    level: 3,
    name: "精英冒险者",
    short: "精英",
    powerMin: 60,
    powerMax: 100,
    prob: 0.09,
    tone: 3,
    image: "/characters/r3-elite.jpg",
  },
  {
    level: 4,
    name: "英雄冒险者",
    short: "英雄",
    powerMin: 100,
    powerMax: 150,
    prob: 0.03,
    tone: 4,
    image: "/characters/r4-hero.jpg",
  },
  {
    level: 5,
    name: "传奇冒险者",
    short: "传奇",
    powerMin: 150,
    powerMax: 199,
    prob: 0.01,
    tone: 5,
    image: "/characters/r5-legendary.jpg",
  },
]

export const RARITY_BY_LEVEL: Record<RarityLevel, Rarity> = RARITIES.reduce(
  (acc, r) => ({ ...acc, [r.level]: r }),
  {} as Record<RarityLevel, Rarity>,
)

export interface Material {
  key: MaterialKey
  name: string
  desc: string
  image: string
}

export const MATERIALS: Material[] = [
  {
    key: "AE",
    name: "远古精华",
    desc: "Ancient Essence — 副本最普遍掉落的基础材料。",
    image: "/materials/ae-arcane-essence.jpg",
  },
  {
    key: "BF",
    name: "战魂碎片",
    desc: "Battle Fragment — 中阶副本核心产出，合成必备。",
    image: "/materials/bf-blood-fragment.jpg",
  },
  {
    key: "MR",
    name: "月光符文",
    desc: "Moon Rune — 高阶副本主产，稀有合成材料。",
    image: "/materials/mr-moon-rune.jpg",
  },
  {
    key: "ES",
    name: "虚空之核",
    desc: "Essence Stone — 顶级副本掉落，传奇合成关键。",
    image: "/materials/es-eldritch-shard.jpg",
  },
]

export const MATERIAL_KEYS: MaterialKey[] = ["AE", "BF", "MR", "ES"]

export interface Dungeon {
  level: number
  minPower: number
  output: Record<MaterialKey, number>
  name: string
  bossName: string
  description: string
  image: string
}

export const DUNGEONS: Dungeon[] = [
  {
    level: 1,
    minPower: 45,
    output: { AE: 38, BF: 19, MR: 0, ES: 0 },
    name: "废墟祭坛",
    bossName: "锈蚀亡兵",
    description: "符文之力初燃的旧时神殿，亡灵在此低语。",
    image: "/dungeons/d1-crumbling-altar.jpg",
  },
  {
    level: 2,
    minPower: 90,
    output: { AE: 31, BF: 24, MR: 0, ES: 0 },
    name: "低语洞窟",
    bossName: "符文巨怪",
    description: "深处石壁布满古老符纹，巨怪以血祭饲养水晶。",
    image: "/dungeons/d2-whispering-caverns.jpg",
  },
  {
    level: 3,
    minPower: 180,
    output: { AE: 33, BF: 51, MR: 48, ES: 14 },
    name: "冰封圣所",
    bossName: "霜息巨人",
    description: "永冻不化的冰柱大殿，霜息巨人以冰斧守护遗迹。",
    image: "/dungeons/d3-frozen-sanctum.jpg",
  },
  {
    level: 4,
    minPower: 300,
    output: { AE: 15, BF: 30, MR: 58, ES: 29 },
    name: "熔焰熔炉",
    bossName: "炎息熔魔",
    description: "熔岩之河贯穿地心熔炉，恶魔以熔锤锻造毁灭之锋。",
    image: "/dungeons/d4-ember-forge.jpg",
  },
  {
    level: 5,
    minPower: 450,
    output: { AE: 17, BF: 22, MR: 82, ES: 38 },
    name: "虚空大教堂",
    bossName: "亡灵主教",
    description: "破碎的彩窗映照宇宙虚空，巫妖王在此低声咒语。",
    image: "/dungeons/d5-void-cathedral.jpg",
  },
  {
    level: 6,
    minPower: 550,
    output: { AE: 23, BF: 16, MR: 68, ES: 65 },
    name: "深渊王座",
    bossName: "深渊主宰",
    description: "悬浮于虚无之上的王座，深渊主宰俯视一切冒险者。",
    image: "/dungeons/d6-abyssal-throne.jpg",
  },
]

/** Backward-compat name lookup (legacy components may still import this). */
export const DUNGEON_NAMES: Record<number, string> = DUNGEONS.reduce(
  (acc, d) => ({ ...acc, [d.level]: d.name }),
  {} as Record<number, string>,
)

export interface SynthesisCost {
  level: RarityLevel
  AE: number
  BF: number
  MR: number
  ES: number
  advent: number
}

export const SYNTHESIS_COSTS: SynthesisCost[] = [
  { level: 1, AE: 380, BF: 290, MR: 140, ES: 25, advent: 150 },
  { level: 2, AE: 850, BF: 650, MR: 340, ES: 90, advent: 450 },
  { level: 3, AE: 1780, BF: 1350, MR: 780, ES: 230, advent: 1125 },
  { level: 4, AE: 3780, BF: 2850, MR: 1620, ES: 580, advent: 2250 },
  { level: 5, AE: 7950, BF: 5920, MR: 3350, ES: 1300, advent: 4500 },
]

// 经济参数
export const SUMMON_BASE_COST = 50_000
export const SUMMON_TIER_SIZE = 1_000
export const SUMMON_TIER_INCREASE = 0.1 // +10%
export const TOTAL_CHAR_CAP = 6_000

export const ENERGY_PRICE_USDT = 0.5
export const NEW_PLAYER_ENERGY = 5

export const MAX_TEAMS_PER_ACCOUNT = 8
export const TEAM_COOLDOWN_HOURS = 24

export const MARKET_FEE = 0.05
export const REFERRAL_DIRECT = 0.10
export const REFERRAL_INDIRECT = 0.05

/** 当前抽角色的递增价格 — 全服累计抽取数 */
export function summonCostAt(globalSummoned: number): number {
  const tier = Math.floor(globalSummoned / SUMMON_TIER_SIZE)
  return Math.round(SUMMON_BASE_COST * (1 + SUMMON_TIER_INCREASE) ** tier)
}

/** 全服召唤上限进度：按每 {@link SUMMON_TIER_SIZE} 一段「当前阶段」填充进度条；末段不足 1000 时阶段上限为剩余名额 */
export type SummonCapPhaseProgress = {
  /** 当前阶段序号，从 1 开始 */
  phaseDisplay: number
  phaseTotal: number
  phaseSize: number
  phaseFilled: number
  phasePct: number
  cappedSummoned: number
}

export function summonCapPhaseProgress(
  globalSummoned: number,
  charCap: number,
): SummonCapPhaseProgress {
  const totalPhases = Math.max(1, Math.ceil(charCap / SUMMON_TIER_SIZE))
  const cappedSummoned = Math.min(
    Math.max(0, globalSummoned),
    Math.max(0, charCap),
  )
  const tierIndex = Math.min(
    Math.floor(cappedSummoned / SUMMON_TIER_SIZE),
    totalPhases - 1,
  )
  const phaseStart = tierIndex * SUMMON_TIER_SIZE
  const phaseEnd = Math.min(phaseStart + SUMMON_TIER_SIZE, charCap)
  const phaseSize = Math.max(0, phaseEnd - phaseStart)
  const phaseFilled =
    phaseSize > 0
      ? Math.max(0, Math.min(cappedSummoned - phaseStart, phaseSize))
      : 0
  const phasePct =
    phaseSize > 0
      ? Math.min(100, (phaseFilled / phaseSize) * 100)
      : charCap > 0
        ? 100
        : 0

  return {
    phaseDisplay: tierIndex + 1,
    phaseTotal: totalPhases,
    phaseSize,
    phaseFilled,
    phasePct,
    cappedSummoned,
  }
}

/** 按概率随机一个稀有度等级 */
export function rollRarity(): RarityLevel {
  const roll = Math.random()
  let acc = 0
  for (const r of RARITIES) {
    acc += r.prob
    if (roll <= acc) return r.level
  }
  return 1
}

/** 在该稀有度的战力区间内随机一个值 */
export function rollPower(rarity: RarityLevel): number {
  const r = RARITY_BY_LEVEL[rarity]
  return Math.floor(Math.random() * (r.powerMax - r.powerMin + 1)) + r.powerMin
}

export const CLASS_NAMES = [
  "影刃刺客",
  "破甲剑士",
  "星辉法师",
  "苍穹弓手",
  "圣盾守卫",
  "炎息术士",
] as const
export type CharacterClass = (typeof CLASS_NAMES)[number]
