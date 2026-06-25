"use client"

import * as React from "react"

export function formatSummonCountdown(remainingMs: number): {
  days: number
  hours: number
  minutes: number
  seconds: number
} {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return { days, hours, minutes, seconds }
}

/** @param opensAtSec链上 drawOpensAt；0 表示不限制 */
export function useSummonOpens(opensAtSec: number) {
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const isGated = opensAtSec > 0
  const opensAtMs = opensAtSec * 1000

  React.useEffect(() => {
    if (!isGated) return
    const tick = () => setNowMs(Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [isGated, opensAtSec])

  const isOpen = !isGated || nowMs >= opensAtMs
  const remainingMs = isOpen ? 0 : opensAtMs - nowMs

  return { isOpen, isGated, remainingMs, opensAtSec, opensAtMs }
}
