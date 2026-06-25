"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "title"> & {
  className?: string
  /** Pixel size (width and height). */
  size?: number
  /** Optional label; pass `null` for decorative usage next to token text. */
  title?: string | null
}

/** $草根社 token mark — official fair-launch logo (distinct from site RuneAbyssLogo). */
export function GrassrootsTokenIcon({
  className,
  size,
  title = null,
  width,
  height,
  alt,
  ...rest
}: Props) {
  const labelled = title !== null
  const s =
    size ??
    (typeof width === "number" ? width : undefined) ??
    (typeof height === "number" ? height : undefined) ??
    16

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/grassroots-token-logo.png"
      alt={labelled ? (title ?? "$草根社") : ""}
      width={size ?? width ?? s}
      height={size ?? height ?? s}
      className={cn("shrink-0 object-contain", className)}
      role={labelled ? "img" : "presentation"}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    />
  )
}
