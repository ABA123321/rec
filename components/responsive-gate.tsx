"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"

/**
 * 响应式分流组件：在桌面端渲染 `desktop`，在移动端渲染 `mobile`。
 *
 * 行为：
 * - SSR 与首次客户端渲染均输出 `desktop`（与 useIsMobile 初始 `undefined → false` 一致），不会出现 hydration mismatch。
 * - 挂载后 useIsMobile 用 useLayoutEffect + matchMedia 同步视口，尽量在首帧绘制前切到 `mobile`，减轻窄屏闪桌面布局。
 * - 仅其中一棵子树会被挂载，避免重复 effect / 双倍状态。
 *
 * 注意：所有 game 页面共享 GameProvider，所以即使切换分支链上数据也无需重新拉取。
 */
export function ResponsiveGate({
  desktop,
  mobile,
}: {
  desktop: React.ReactNode
  mobile: React.ReactNode
}) {
  const isMobile = useIsMobile()
  return isMobile ? <>{mobile}</> : <>{desktop}</>
}
