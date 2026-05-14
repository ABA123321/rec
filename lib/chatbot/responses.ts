/**
 * ChatBot 回答库 — 游戏相关知识库
 * 每条回答包括：关键词、问题示例、回答文本
 */

export interface Response {
  keywords: string[]
  examples: string[]
  answer: string
}

export const RESPONSES: Response[] = [
  {
    keywords: ["角色", "冒险者", "召唤", "英雄"],
    examples: ["如何召唤角色？", "怎么获得新冒险者？", "角色升级"],
    answer:
      "在【召唤】页面可以消耗金币进行召唤。支持单次或十连召唤，高级别角色出率更低。已有的角色可以在【主控台】或【队伍】页面查看和编队。",
  },
  {
    keywords: ["队伍", "编队", "组队", "战队"],
    examples: ["怎么组建队伍？", "如何编队？", "队伍最多几个人"],
    answer:
      "每个账户最多可创建 8 支队伍。在【队伍】页面点击【+ 创建队伍】，选择 3 个空闲冒险者即可。每支队伍的冒险者不可重复。",
  },
  {
    keywords: ["市场", "内盘", "交易", "买卖"],
    examples: ["怎么买卖材料？", "如何在内盘交易？", "材料市场在哪"],
    answer:
      "在【内盘市场】可以买卖各类材料。【买单】需先授权 USDT，【挂单】需先授权 ERC1155。手续费为交易金额的 5%。",
  },
  {
    keywords: ["体力", "stamina", "购买体力"],
    examples: ["体力怎么恢复？", "如何购买体力？", "体力不足"],
    answer:
      "在【主控台】可以购买体力。每购买 100 点体力需要 50 USDT。购买前需授权 USDT 给 Stamina 合约。",
  },
  {
    keywords: ["推荐", "邀请", "返佣", "分销"],
    examples: ["推荐链接在哪？", "怎么获得返佣？", "推荐人有什么好处"],
    answer:
      "在【推荐】页面可以生成和分享推荐链接。当下级消费时，您作为直推获得消费额的 10%，作为间推获得 5%。自动以 USDT 结算到钱包。",
  },
  {
    keywords: ["钱包", "连接", "BSC", "签名"],
    examples: ["如何连接钱包？", "支持什么钱包？", "需要充值吗"],
    answer:
      "点击页面右上角【连接钱包】，支持 MetaMask、Trust Wallet 等 BSC 兼容钱包。连接后系统会自动读取您的链上资产和状态，无需额外充值。",
  },
  {
    keywords: ["$REBC", "USDT", "资产", "余额"],
    examples: ["怎么查看余额？", "如何转账？", "资产在哪里"],
    answer:
      "连接钱包后，主控台顶栏会显示您的 $REBC 和 USDT 余额。所有资产都在您的 BSC 钱包中，可随时通过钱包APP转账或交易。",
  },
  {
    keywords: ["新手", "帮助", "教程", "开始"],
    examples: ["如何开始游戏？", "新手指南", "第一步做什么"],
    answer:
      "1) 连接 BSC 钱包 2) 前往【主控台】领取新手体力 3) 在【召唤】获得初始角色 4) 【队伍】组建战队 5) 开始冒险赚取材料。",
  },
  {
    keywords: ["bug", "问题", "错误", "卡"],
    examples: ["遇到问题怎么办？", "游戏卡住了", "交易失败"],
    answer:
      "常见解决方案：1) 刷新页面 2) 清空浏览器缓存 3) 检查钱包余额和网络 4) 确认 BSC 主网连接。如问题持续，请截图并反馈。",
  },
  {
    keywords: ["授权", "approve", "allowance"],
    examples: ["为什么需要授权？", "授权是干什么的？", "如何授权"],
    answer:
      "授权允许智能合约从您的账户转账代币。在内盘买单前需授权 USDT；购买体力前需授权 USDT；挂单前需授权 Materials ERC1155。授权是安全的标准操作。",
  },
  {
    keywords: ["hello", "hi", "你好", "嗨"],
    examples: ["你好", "Hi", "Hello"],
    answer:
      "你好！👋 欢迎来到符文深渊。有任何关于游戏的问题吗？我可以帮你解答角色、队伍、市场、推荐等相关内容。",
  },
  {
    keywords: [""],
    examples: ["帮助", "Help"],
    answer:
      "我是符文深渊的游戏助手，可以解答以下话题：\n• 角色召唤和升级\n• 队伍编成和管理\n• 内盘市场交易\n• 体力购买\n• 推荐返佣机制\n• 钱包连接\n• 常见问题\n\n随时问我！",
  },
]

/**
 * 回答库 - 兜底/未匹配
 */
export const DEFAULT_ANSWER =
  "感谢提问！我现在还无法完全理解您的问题。可以尝试问关于【角色】【队伍】【市场】【体力】【推荐】【钱包】等方面的内容，我会给您准确答复。"

/**
 * 获取最匹配的回答
 */
export function getResponse(query: string): string {
  const normalized = query.toLowerCase().trim()

  // 完全匹配优先
  for (const res of RESPONSES) {
    if (res.keywords.some((kw) => normalized.includes(kw) && kw.length > 0)) {
      return res.answer
    }
  }

  // 兜底
  return DEFAULT_ANSWER
}
