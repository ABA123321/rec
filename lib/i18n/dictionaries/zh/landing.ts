export const landing = {
  heroBadge: "BSC · Chain ID 56 · 公平发射",
  heroSubtitle: "符 文 深 渊",
  heroLead:
    "零通胀链游 · 3 角色组队 · 每日挑战副本产出材料 · 纯 USDT 内盘流通 · 纯材料合成稀有冒险者。代币 $REBC，总量 10 亿，公平发射。",
  rebcMintCta: "REBC铸造",
  stats: {
    supply: { k: "代币总量", v: "10 亿", sub: "$REBC" },
    cap: { k: "角色上限", v: "{cap}", sub: "全服稀缺" },
    energy: { k: "体力价格", v: "{price} U", sub: "新手可领 5 点" },
    dungeons: { k: "副本等级", v: "{n} 阶", sub: "战力门槛递增" },
  },
  rarityEyebrow: "Rarity Tiers",
  rarityTitle: "五阶冒险者 · 战力区间",
  rarityGoSummon: "前往召唤 →",
  portraitAlt: "{name} 立绘",
  powerLabel: "战力",
  featuresEyebrow: "Core Loop",
  featuresTitle: "六大模块构成的零通胀闭环",
  features: [
    {
      title: "符文召唤",
      desc: "初始 {summonCost} $REBC 抽角色，每 1000 个 +10%，全服上限 {cap}。",
    },
    {
      title: "队伍编成",
      desc: "3 角色组队，单账号最多 8 队，每队独立 24h 冷却。",
    },
    {
      title: "副本远征",
      desc: "1 点体力挑战 {dungeonCount} 级副本，按战力门槛产出 AE / BF / MR / ES。",
    },
    {
      title: "符文合成",
      desc: "100% 成功率，材料 + $REBC 进入黑洞，铸造更稀有的冒险者。",
    },
    {
      title: "内盘交易",
      desc: "USDT 挂卖，支持部分购买，统一 {feePct}% 手续费。",
    },
    {
      title: "推荐系统",
      desc: "自助绑定，直推 {directPct}% / 间推 {indirectPct}%。",
    },
  ] as const,
  economyEyebrow: "Economy",
  economyTitle: "零通胀 · 通缩 · 内盘流通",
  economyLead:
    "材料只能通过副本掉落，不可铸造；合成消耗的材料与代币 100% 进入黑洞地址，玩家以 USDT 为媒介在内盘自由交易。每一次抽取、合成、购买体力都让代币与材料离开流通。",
  economyStats: [
    { k: "通胀", v: "0", sub: "材料无增发" },
    { k: "销毁", v: "100%", sub: "合成入黑洞" },
    { k: "手续费", v: "{feePct}%", sub: "内盘交易" },
  ] as const,
  adventTagline: "公平发射 · 总量 1,000,000,000",
  ecosystemEyebrow: "合作伙伴 · 工具",
  ecosystemTitle: "钱包 · 行情 · 链上查询",
  ecosystemLead:
    "以下为常用第三方钱包与数据站点，便于连接钱包与查询代币行情；链接独立跳转，不代表官方合作背书。",
  openInNewTab: "（新标签页打开）",
  footerMvp: "Rune Abyss · MVP 版（真实链上数据）",
} as const
