"use client"

import * as React from "react"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { isAddress, zeroAddress } from "viem"

export function HubResonancePanel() {
  const { messages: m } = useLocale()
  const h = m.hub
  const {
    progressState,
    bindResonancePartner,
    claimResonanceReward,
    isTxPending,
    address,
  } = useGame()
  const [partner, setPartner] = React.useState("")

  if (!progressState) return null

  const hasPartner =
    progressState.resonancePartner !== zeroAddress &&
    progressState.resonancePartner.length > 2
  const min = progressState.resonanceMinChallenges
  const myCount = progressState.resonanceWeekChallenges
  const claimable =
    hasPartner && myCount >= min && !progressState.resonanceWeekClaimed

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
      <p className="mb-2 flex items-center gap-1 font-medium">
        <Users className="size-4 text-primary" aria-hidden />
        {h.resonanceTitle}
      </p>
      {hasPartner ? (
        <>
          <p className="text-xs text-muted-foreground break-all">
            {h.resonancePartner}: {progressState.resonancePartner}
          </p>
          <p className="mt-2 text-xs">
            {interpolate(h.resonanceProgress, {
              n: String(myCount),
              min: String(min),
            })}
          </p>
          <Button
            size="sm"
            className="mt-2 w-full"
            disabled={!claimable || isTxPending}
            onClick={() => claimResonanceReward()}
          >
            {claimable
              ? interpolate(h.resonanceClaim, {
                  n: String(progressState.resonanceStaminaReward),
                })
              : h.resonanceIncomplete}
          </Button>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{h.resonanceDesc}</p>
          <div className="flex gap-2">
            <Input
              placeholder={h.resonancePlaceholder}
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="h-8 text-xs"
              disabled={isTxPending}
            />
            <Button
              size="sm"
              disabled={isTxPending || !isAddress(partner) || partner.toLowerCase() === address?.toLowerCase()}
              onClick={() => bindResonancePartner(partner)}
            >
              {h.resonanceBind}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
