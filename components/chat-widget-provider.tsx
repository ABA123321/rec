"use client"

import { ChatWidget } from "@/components/chat-widget"

/**
 * 全站 ChatWidget 包装器 — 在所有页面（包括首页）显示符文妹妹浮窗。
 * 无需连接钱包即可使用 AI 对话。
 */
export function ChatWidgetProvider() {
  return <ChatWidget />
}
