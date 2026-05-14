"use client"

import dynamic from "next/dynamic"

const ChatWidgetProvider = dynamic(
  () =>
    import("@/components/chat-widget-provider").then((m) => ({
      default: m.ChatWidgetProvider,
    })),
  { ssr: false },
)

const ReferralBindModal = dynamic(
  () =>
    import("@/components/referral-bind-modal").then((m) => ({
      default: m.ReferralBindModal,
    })),
  { ssr: false },
)

/** 延后加载 AI 聊天与推荐弹窗，减轻 dev 编译与首屏解析压力 */
export function DeferredLayoutWidgets() {
  return (
    <>
      <ChatWidgetProvider />
      <ReferralBindModal />
    </>
  )
}
