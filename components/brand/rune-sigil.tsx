"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * RuneSigil — /rune-sigil.png
 *
 * - **lg 及以上**：`mask-mode: luminance` + backgroundColor 染色（保留 `color`）。
 * - **&lt; lg**：直接渲染原图（含横屏手机）。iOS Safari 对 mask 常按 alpha 处理 → 圆形色块；
 *   横屏宽度常超过 768，只用 `md` 仍会走错分支。
 */
type Props = {
  className?: string
  /** 是否缓慢自旋 */
  spin?: boolean
  /** 自旋周期（秒） */
  spinDuration?: number
  /** 整体不透明度 */
  opacity?: number
  /** 主色，默认霓虹金 */
  color?: string
  /** 是否带柔和金色光晕 */
  glow?: boolean
}

export function RuneSigil({
  className,
  spin = false,
  spinDuration = 80,
  opacity = 1,
  color = "oklch(0.84 0.16 80)",
  glow = true,
}: Props) {
  const glowFilter = glow
    ? "drop-shadow(0 0 14px oklch(0.84 0.16 80 / 0.55)) drop-shadow(0 0 32px oklch(0.84 0.16 80 / 0.25))"
    : undefined

  const maskLayerStyle = {
    backgroundColor: color,
    WebkitMaskImage: "url(/rune-sigil.png)",
    maskImage: "url(/rune-sigil.png)",
    WebkitMaskMode: "luminance",
    maskMode: "luminance",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    animation: spin ? `rune-spin ${spinDuration}s linear infinite` : undefined,
    transformOrigin: "center",
    willChange: spin ? "transform" : undefined,
    /* 促进合成层，减轻部分 WebKit 下 mask 绘制异常 */
    transform: "translateZ(0)",
  } as React.CSSProperties

  const motionStyle: React.CSSProperties = {
    opacity,
    filter: glowFilter,
    animation: spin ? `rune-spin ${spinDuration}s linear infinite` : undefined,
    transformOrigin: "center",
    willChange: spin ? "transform" : undefined,
  }

  return (
    <div className={cn("relative", className)} aria-hidden>
      <div className="absolute inset-0 lg:hidden" style={motionStyle}>
        <Image
          src="/rune-sigil.png"
          alt=""
          fill
          sizes="min(100vw, 28rem)"
          className="pointer-events-none object-contain object-center select-none"
          draggable={false}
        />
      </div>

      <div className="absolute inset-0 hidden lg:block" style={{ opacity, filter: glowFilter }}>
        <div className="absolute inset-0" style={maskLayerStyle} />
      </div>
    </div>
  )
}
