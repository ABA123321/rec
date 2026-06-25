"use client"

import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  formatSummonCountdown,
  useSummonOpens,
} from "@/lib/hooks/use-summon-opens"

type CountdownLabels = {
  title: string
  countdown: string
  opensAtLabel: string
  opensAt: string
  unit: { d: string; h: string; m: string; s: string }
}

function CountdownUnit({
  value,
  label,
  compact,
}: {
  value: number
  label: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 font-mono tabular-nums",
        compact ? "min-w-[3rem]" : "min-w-[3.5rem]",
      )}
    >
      <span className={cn("font-semibold text-primary", compact ? "text-xl" : "text-2xl")}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function SummonOpensCountdown({
  opensAtSec,
  labels,
  compact,
  className,
}: {
  opensAtSec: number
  labels: CountdownLabels
  compact?: boolean
  className?: string
}) {
  const { isGated, isOpen, remainingMs } = useSummonOpens(opensAtSec)

  if (!isGated || isOpen) return null

  const { days, hours, minutes, seconds } = formatSummonCountdown(remainingMs)

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/40 bg-gradient-to-b from-primary/10 to-background/60 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-primary">
        <Clock className="size-4 shrink-0" aria-hidden />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em]">{labels.title}</p>
      </div>
      <p className="mt-2 font-serif text-lg sm:text-xl">{labels.countdown}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {days > 0 ? <CountdownUnit value={days} label={labels.unit.d} compact={compact} /> : null}
        <CountdownUnit value={hours} label={labels.unit.h} compact={compact} />
        <CountdownUnit value={minutes} label={labels.unit.m} compact={compact} />
        <CountdownUnit value={seconds} label={labels.unit.s} compact={compact} />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {labels.opensAtLabel} · {labels.opensAt}
      </p>
    </div>
  )
}
