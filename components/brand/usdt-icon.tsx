"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Props = React.SVGProps<SVGSVGElement> & {
  className?: string
  /** Pixel size (width and height). */
  size?: number
  /** Optional label; pass `null` for decorative usage next to text. */
  title?: string | null
}

/** USDT mint mark — green disk + T (common wallet / DeFi UX pattern). */
export function UsdtIcon({
  className,
  size,
  title = null,
  width,
  height,
  ...rest
}: Props) {
  const labelled = title !== null
  const s = size ?? width ?? height ?? 16
  return (
    <svg
      viewBox="0 0 32 32"
      width={size ?? width ?? s}
      height={size ?? height ?? s}
      className={cn("shrink-0", className)}
      role={labelled ? "img" : "presentation"}
      aria-label={labelled ? (title ?? undefined) : undefined}
      aria-hidden={labelled ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M7 11h18v2.8H17.75v11.2h-3.5V13.8H7V11z"
      />
    </svg>
  )
}
