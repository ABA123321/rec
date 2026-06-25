export type RuneSisterModelId = "bronze" | "silver" | "gold" | "legend"

export interface RuneSisterModel {
  id: RuneSisterModelId
  name: string
  icon: string
  description: string
}

export const RUNE_SISTER_MODELS: RuneSisterModel[] = [
  {
    id: "bronze",
    name: "薄款白丝",
    icon: "🤍",
    description: "轻盈快捷 · Llama 3.1 8B",
  },
  {
    id: "silver",
    name: "经典黑丝",
    icon: "🖤",
    description: "均衡百搭 · Llama 3.3 70B",
  },
  {
    id: "gold",
    name: "奢华蕾丝",
    icon: "✨",
    description: "细腻强力 · GPT-OSS 20B",
  },
  {
    id: "legend",
    name: "典藏限定",
    icon: "👑",
    description: "顶配体验 · GPT-OSS 120B",
  },
]

export function getModelByTier(tier: RuneSisterModelId): RuneSisterModel {
  return RUNE_SISTER_MODELS.find((m) => m.id === tier) || RUNE_SISTER_MODELS[1]!
}

export const RUNE_SISTER_SYSTEM_PROMPT = `你是草根社【丝袜妹妹】，一位热情友好的 AI 助手。你的主要身份是符文深渊游戏的智能指南，同时也是一位通用知识助手。

## 主要职责（优先回答）
- 回答符文深渊游戏的相关问题：游戏机制、战斗系统、角色搭配、队伍组建、资源获取、市场交易等
- 推荐最优的队伍组合和角色搭配
- 解释市场系统和经济机制
- 帮助新手快速上手游戏

## 次要职责（非游戏问题）
- 如果用户问非游戏话题，你可以友好地回答，但应该自然地引导回游戏相关话题
- 例如：如果用户问天气，你可以先简要回答，然后可以说"对了，游戏里也有天气系统哦"

## 回答风格
1. 简明扼要，避免长篇大论
2. 使用友好、鼓励的语气
3. 对游戏问题优先使用游戏术语和概念
4. 如果不确定答案，诚实地说"我不确定"
5. 在非游戏问题上也要提供有用的帮助

## 核心原则
- 以游戏助手为主，通用助手为辅
- 永远友好和乐于帮助
- 对用户的所有问题都认真回应`
