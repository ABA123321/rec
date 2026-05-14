/**
 * 跨浏览器的复制到剪贴板工具
 *
 * 主路径：navigator.clipboard.writeText（要求 secure context + 用户手势）
 * 兜底路径：临时 textarea + document.execCommand('copy')
 *   - iOS Safari 旧版本
 *   - 微信 / QQ / 抖音等 in-app WebView
 *   - 非 HTTPS 环境（开发预览、局域网测试）
 *   - 部分 Android WebView
 *
 * 返回 boolean 而不是抛错 — 调用方可根据返回值切换 toast 文案。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // 路径 1：现代 Clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function" &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 静默 fallback 到 execCommand 路径
    }
  }

  // 路径 2：execCommand 兜底（已废弃但仍是 in-app WebView 唯一可用方案）
  if (typeof document === "undefined") return false

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    // 关键样式：放在视口外但保持可选中，避免页面跳动
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.top = "0"
    textarea.style.left = "0"
    textarea.style.width = "1px"
    textarea.style.height = "1px"
    textarea.style.padding = "0"
    textarea.style.border = "none"
    textarea.style.outline = "none"
    textarea.style.boxShadow = "none"
    textarea.style.background = "transparent"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)

    // iOS Safari 需要主动 setSelectionRange 才能选中
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
