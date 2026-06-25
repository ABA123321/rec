"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type Props = React.SVGProps<SVGSVGElement> & {
  className?: string
  /** Render with a slight glow halo (good for hero sections / dark backgrounds). */
  glow?: boolean
  /** Pixel size (sets width and height). */
  size?: number
  /** Optional aria-label; pass `null` for purely decorative usage. */
  title?: string | null
}

/**
 * Rune Abyss — website brand mark (header, lockup, favicon).
 *
 * A circular gold medallion with four cardinal rune ticks, a runic "A" engraved
 * inside, and a cyan abyss-glow inner ring. For $草根社 token amounts and costs,
 * use GrassrootsTokenIcon instead.
 *
 * Important: gradient `id`s are generated per-instance with React.useId() so
 * that multiple logos on the same page never clash. A solid-gold underlay
 * acts as a fallback if the gradient ever fails to resolve.
 */
export function RuneAbyssLogo({
  className,
  glow = false,
  size,
  title = "Rune Abyss",
  width,
  height,
  ...rest
}: Props) {
  const labelled = title !== null
  // Per-instance unique ids for gradients so multiple logos on a page don't collide.
  const uid = React.useId().replace(/:/g, "")
  const goldId = `ra-gold-${uid}`
  const sheenId = `ra-sheen-${uid}`

  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? width ?? 32}
      height={size ?? height ?? 32}
      role={labelled ? "img" : "presentation"}
      aria-label={labelled ? title ?? undefined : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cn(
        "shrink-0",
        glow && "drop-shadow-[0_0_12px_rgba(212,175,55,0.45)]",
        className,
      )}
      {...rest}
    >
      <defs>
        <linearGradient id={goldId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d28a" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#7a4f12" />
        </linearGradient>
        <radialGradient id={sheenId} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#fff5d6" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#fff5d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Solid-gold fallback so the medallion is always visible
          even if the gradient ever fails to resolve. */}
      <circle cx="32" cy="32" r="30" fill="#d4af37" />

      {/* Outer medallion */}
      <circle cx="32" cy="32" r="30" fill={`url(#${goldId})`} />
      <circle cx="32" cy="32" r="30" fill={`url(#${sheenId})`} />
      <circle
        cx="32"
        cy="32"
        r="29.25"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1.5"
      />

      {/* Inner abyss ring (cyan accent) */}
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke="rgba(20, 184, 166, 0.55)"
        strokeWidth="0.6"
        strokeDasharray="1.5 2.5"
      />

      {/* Cardinal rune ticks */}
      <g stroke="rgba(10,13,18,0.75)" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="4.5" x2="32" y2="9" />
        <line x1="32" y1="55" x2="32" y2="59.5" />
        <line x1="4.5" y1="32" x2="9" y2="32" />
        <line x1="55" y1="32" x2="59.5" y2="32" />
      </g>

      {/* Runic "A" — Rune Abyss / ADVENT */}
      <g
        stroke="#0a0d12"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M19 46 L32 17 L45 46" />
        <path d="M25 36 L39 36" />
        {/* serifs */}
        <path d="M16 46 L22 46" />
        <path d="M42 46 L48 46" />
      </g>

      {/* Center sparks */}
      <circle cx="32" cy="44" r="1.6" fill="#0a0d12" />
      <circle cx="32" cy="44" r="0.7" fill="#5eead4" />
    </svg>
  )
}

/**
 * Horizontal lockup: mark + wordmark.
 */
export function RuneAbyssLockup({
  className,
  size = 36,
  glow,
}: {
  className?: string
  size?: number
  glow?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <RuneAbyssLogo size={size} glow={glow} title={null} />
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-lg tracking-wide text-glow-gold">
          Rune Abyss
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          符文深渊
        </span>
      </span>
    </span>
  )
}
