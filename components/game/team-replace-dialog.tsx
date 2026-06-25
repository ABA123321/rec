"use client"

import * as React from "react"
import { Plus, UserPlus } from "lucide-react"

import { CharacterCard } from "@/components/game/character-card"
import { TeamUnbindButton } from "@/components/game/team-unbind-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGame, type Character, type Team } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"

function getAvailableForSlot(
  characters: Character[],
  teams: Team[],
  teamId: string,
  slotIndex: number,
  characterIds: [string, string, string],
): Character[] {
  const currentId = characterIds[slotIndex]
  const blocked = new Set<string>()

  for (const team of teams) {
    for (let i = 0; i < team.characterIds.length; i++) {
      const id = team.characterIds[i]
      if (id === "0") continue
      if (team.id === teamId && i === slotIndex) continue
      blocked.add(id)
    }
  }

  if (currentId !== "0") blocked.delete(currentId)

  return characters.filter((c) => !blocked.has(c.id))
}

export function TeamReplaceDialog({
  teamId,
  slotIndex,
  characterIds,
  currentMember,
  open,
  onOpenChange,
}: {
  teamId: string
  slotIndex: number
  characterIds: [string, string, string]
  currentMember?: Character
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const s = loc.game.shared
  const { characters, teams, replaceTeamMember, isTxPending } = useGame()
  const [picked, setPicked] = React.useState<string | null>(null)

  const isAdd = !currentMember
  const available = React.useMemo(
    () => getAvailableForSlot(characters, teams, teamId, slotIndex, characterIds),
    [characters, teams, teamId, slotIndex, characterIds],
  )

  React.useEffect(() => {
    if (!open) setPicked(null)
  }, [open])

  const confirm = async () => {
    if (!picked) return
    const ok = await replaceTeamMember(teamId, slotIndex, picked)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isAdd ? t.addMemberTitle : t.replaceMemberTitle}
          </DialogTitle>
          <DialogDescription>
            {isAdd ? t.addMemberDesc : t.replaceMemberDesc}
          </DialogDescription>
        </DialogHeader>

        {currentMember ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              {t.replaceCurrent}
            </p>
            <CharacterCard character={currentMember} size="sm" />
          </div>
        ) : null}

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noFree}</p>
        ) : (
          <ul className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {available.map((c) => (
              <li key={c.id}>
                <CharacterCard
                  character={c}
                  selectable
                  selected={picked === c.id}
                  onSelect={() => setPicked(c.id)}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTxPending}>
            {s.cancel}
          </Button>
          <Button
            className="gap-1"
            disabled={isTxPending || !picked}
            onClick={confirm}
          >
            <UserPlus className="size-4" aria-hidden />
            {isAdd ? t.addMemberConfirm : t.replaceMemberConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TeamSlotCell({
  teamId,
  slotIndex,
  characterIds,
  charactersById,
}: {
  teamId: string
  slotIndex: number
  characterIds: [string, string, string]
  charactersById: Map<string, Character>
}) {
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const [open, setOpen] = React.useState(false)

  const charId = characterIds[slotIndex]
  const member = charId !== "0" ? charactersById.get(charId) : undefined

  if (member) {
    return (
      <div className="flex flex-col gap-1">
        <CharacterCard character={member} size="sm" />
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] text-muted-foreground hover:text-primary"
            onClick={() => setOpen(true)}
          >
            {t.replaceMember}
          </Button>
          <TeamUnbindButton teamId={teamId} slotIndex={slotIndex} member={member} />
        </div>
        <TeamReplaceDialog
          teamId={teamId}
          slotIndex={slotIndex}
          characterIds={characterIds}
          currentMember={member}
          open={open}
          onOpenChange={setOpen}
        />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/80",
          "bg-muted/10 px-2 py-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/20 hover:text-primary",
        )}
      >
        <Plus className="size-4" aria-hidden />
        <span className="text-[10px]">{t.addMember}</span>
      </button>
      <TeamReplaceDialog
        teamId={teamId}
        slotIndex={slotIndex}
        characterIds={characterIds}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
