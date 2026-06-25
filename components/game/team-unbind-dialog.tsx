"use client"

import * as React from "react"
import { UserMinus } from "lucide-react"

import { CharacterCard } from "@/components/game/character-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGame, type Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { tokenToNumber } from "@/lib/web3/format"

export function TeamUnbindDialog({
  teamId,
  slotIndex,
  member,
  open,
  onOpenChange,
}: {
  teamId: string
  slotIndex: number
  member: Character
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const s = loc.game.shared
  const { unbindTeamCharacter, unbindAdventCost, isTxPending } = useGame()

  const cost = tokenToNumber(unbindAdventCost)

  const confirm = async () => {
    const ok = await unbindTeamCharacter(teamId, slotIndex)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t.unbindTitle}</DialogTitle>
          <DialogDescription>{t.unbindDesc}</DialogDescription>
        </DialogHeader>
        <CharacterCard character={member} size="sm" />
        <p className="text-sm text-muted-foreground">
          {interpolate(t.unbindCost, { cost: cost.toLocaleString() })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTxPending}>
            {s.cancel}
          </Button>
          <Button
            variant="destructive"
            className="gap-1"
            disabled={isTxPending || unbindAdventCost === 0n}
            onClick={confirm}
          >
            <UserMinus className="size-4" aria-hidden />
            {t.unbindConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TeamUnbindMenuButton({
  teamId,
  characterIds,
  charactersById,
  className,
}: {
  teamId: string
  characterIds: [string, string, string]
  charactersById: Map<string, Character>
  className?: string
}) {
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const { unbindAdventCost } = useGame()
  const [pick, setPick] = React.useState<{ slotIndex: number; member: Character } | null>(null)

  if (unbindAdventCost === 0n) return null

  const slots = characterIds.flatMap((id, slotIndex) => {
    if (id === "0") return []
    const member = charactersById.get(id)
    return member ? [{ slotIndex, member }] : []
  })

  if (slots.length === 0) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className={className}>
            <UserMinus className="size-3.5" aria-hidden />
            {t.unbind}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {slots.map(({ slotIndex, member }) => (
            <DropdownMenuItem key={member.id} onClick={() => setPick({ slotIndex, member })}>
              #{member.id} · {member.power}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {pick ? (
        <TeamUnbindDialog
          teamId={teamId}
          slotIndex={pick.slotIndex}
          member={pick.member}
          open
          onOpenChange={(open) => {
            if (!open) setPick(null)
          }}
        />
      ) : null}
    </>
  )
}

export function TeamUnbindButton({
  teamId,
  slotIndex,
  member,
}: {
  teamId: string
  slotIndex: number
  member: Character
}) {
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const { unbindAdventCost } = useGame()
  const [open, setOpen] = React.useState(false)

  if (unbindAdventCost === 0n) return null

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-full text-[10px] text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        {t.unbind}
      </Button>
      <TeamUnbindDialog
        teamId={teamId}
        slotIndex={slotIndex}
        member={member}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
