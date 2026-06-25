"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Sword,
  Users,
} from "lucide-react"

import { CharacterCard } from "@/components/game/character-card"
import { TeamFormationModal } from "@/components/game/team-formation-modal"
import { TeamSlotCell } from "@/components/game/team-replace-dialog"
import { TeamUnbindMenuButton } from "@/components/game/team-unbind-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGame, type Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { MAX_TEAMS_PER_ACCOUNT } from "@/lib/game-data"
import { MobilePageHeader, MobileSection } from "./mobile-shell"

const ROSTER_PAGE = 9
const AVAILABLE_PAGE = 12
const TEAMS_PAGE = 2

export function MobileTeamsPage() {
  const { characters, teams, createTeam, connected, connect } = useGame()

  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const s = loc.game.shared

  const [creating, setCreating] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>([])
  const [teamName, setTeamName] = React.useState("")
  const [pactOpen, setPactOpen] = React.useState(false)

  const inUse = React.useMemo(
    () => new Set(teams.flatMap((t) => t.characterIds)),
    [teams],
  )
  const available = React.useMemo(
    () => characters.filter((c) => !inUse.has(c.id)),
    [characters, inUse],
  )

  const [rosterPage, setRosterPage] = React.useState(0)
  const [availablePage, setAvailablePage] = React.useState(0)
  const [teamsPage, setTeamsPage] = React.useState(0)

  const rosterTotalPages = Math.max(1, Math.ceil(characters.length / ROSTER_PAGE))
  const availableTotalPages = Math.max(
    1,
    Math.ceil(available.length / AVAILABLE_PAGE),
  )
  const teamsTotalPages = Math.max(1, Math.ceil(teams.length / TEAMS_PAGE))

  React.useEffect(() => {
    if (rosterPage >= rosterTotalPages) setRosterPage(rosterTotalPages - 1)
  }, [rosterPage, rosterTotalPages])
  React.useEffect(() => {
    if (availablePage >= availableTotalPages)
      setAvailablePage(availableTotalPages - 1)
  }, [availablePage, availableTotalPages])
  React.useEffect(() => {
    if (teamsPage >= teamsTotalPages) setTeamsPage(teamsTotalPages - 1)
  }, [teamsPage, teamsTotalPages])

  const rosterPaged = React.useMemo(
    () =>
      characters.slice(rosterPage * ROSTER_PAGE, (rosterPage + 1) * ROSTER_PAGE),
    [characters, rosterPage],
  )
  const availablePaged = React.useMemo(
    () =>
      available.slice(
        availablePage * AVAILABLE_PAGE,
        (availablePage + 1) * AVAILABLE_PAGE,
      ),
    [available, availablePage],
  )
  const teamsPaged = React.useMemo(
    () => teams.slice(teamsPage * TEAMS_PAGE, (teamsPage + 1) * TEAMS_PAGE),
    [teams, teamsPage],
  )

  const togglePick = (id: string) => {
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length >= 3
          ? s
          : [...s, id],
    )
  }

  const charById = React.useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  )
  const selectedChars = selected
    .map((id) => charById.get(id))
    .filter(Boolean) as Character[]
  const previewPower = selectedChars.reduce((s, c) => s + c.power, 0)

  const submit = () => {
    if (selected.length !== 3) return
    setCreating(false)
    setPactOpen(true)
  }
  const sealPact = async () => {
    if (selected.length !== 3) return
    const ok = await createTeam(selected as [string, string, string], teamName)
    if (ok) {
      setPactOpen(false)
      setSelected([])
      setTeamName("")
    }
  }
  const cancelPact = () => {
    setPactOpen(false)
    setCreating(true)
  }

  return (
    <>
      <MobilePageHeader
        title={t.title}
        description={interpolate(t.descMobile, { max: String(MAX_TEAMS_PER_ACCOUNT) })}
        action={
          connected && characters.length > 0 ? (
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              disabled={
                teams.length >= MAX_TEAMS_PER_ACCOUNT || available.length < 3
              }
              className="h-8 gap-1.5"
            >
              <Plus className="size-3.5" aria-hidden />
              {t.newTeam}
            </Button>
          ) : null
        }
      />

      <main className="px-4 pb-6">
        {!connected ? (
          <Empty className="border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyTitle>{s.pleaseConnect}</EmptyTitle>
              <EmptyDescription>{s.teamSaveHint}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={connect}>{s.connectWallet}</Button>
            </EmptyContent>
          </Empty>
        ) : characters.length === 0 ? (
          <Empty className="border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyTitle>{t.noCharactersTitle}</EmptyTitle>
              <EmptyDescription>{t.noCharactersDesc}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild className="gap-2">
                <Link href="/game/summon">
                  <Sparkles className="size-4" aria-hidden />
                  {t.goSummon}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {/* 我的队伍 */}
            <section>
              <div className="mb-2.5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Squads
                  </p>
                  <h2 className="font-serif text-base">
                    {t.myTeams}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({teams.length}/{MAX_TEAMS_PER_ACCOUNT})
                    </span>
                  </h2>
                </div>
                {teamsTotalPages > 1 ? (
                  <Pager
                    shared={s}
                    page={teamsPage}
                    totalPages={teamsTotalPages}
                    onPrev={() => setTeamsPage((p) => Math.max(0, p - 1))}
                    onNext={() =>
                      setTeamsPage((p) =>
                        Math.min(teamsTotalPages - 1, p + 1),
                      )
                    }
                  />
                ) : null}
              </div>

              {teams.length === 0 ? (
                <Empty className="border border-dashed border-border bg-card/40">
                  <EmptyHeader>
                    <EmptyTitle>{t.emptyTeamsTitle}</EmptyTitle>
                    <EmptyDescription>{t.emptyTeamsDesc}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="flex flex-col gap-3">
                  {teamsPaged.map((team) => {
                    const power = team.characterIds.reduce((sum, id) => {
                      const c = id !== "0" ? charById.get(id) : undefined
                      return sum + (c?.power ?? 0)
                    }, 0)
                    const isFull = team.characterIds.every((id) => id !== "0")
                    const cooling = team.cooldownUntil > Date.now()
                    const remaining = cooling
                      ? Math.ceil((team.cooldownUntil - Date.now()) / 60_000)
                      : 0

                    return (
                      <li key={team.id}>
                        <Card className="border-border bg-card/60">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-serif text-base truncate">
                                  {team.name}
                                </h3>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {team.id}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                  {t.totalPower}
                                </div>
                                <div className="font-mono text-xl text-primary leading-none">
                                  {power}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                              {team.characterIds.map((_, slotIndex) => (
                                <TeamSlotCell
                                  key={slotIndex}
                                  teamId={team.id}
                                  slotIndex={slotIndex}
                                  characterIds={team.characterIds}
                                  charactersById={charById}
                                />
                              ))}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div
                                className={`flex items-center gap-1.5 text-[11px] ${
                                  cooling
                                    ? "text-muted-foreground"
                                    : "text-chart-2"
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    cooling
                                      ? "bg-muted-foreground"
                                      : "bg-chart-2 shadow-[0_0_6px_currentColor]"
                                  }`}
                                  aria-hidden
                                />
                                {cooling
                                  ? interpolate(t.cooldown, { m: String(remaining) })
                                  : t.idle}
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  asChild
                                  size="sm"
                                  disabled={cooling || !isFull}
                                  variant={cooling || !isFull ? "outline" : "default"}
                                  className="h-8 gap-1 text-xs"
                                  title={!isFull ? t.teamIncomplete : undefined}
                                >
                                  <Link href="/game/dungeons">
                                    <Sword className="size-3" aria-hidden />
                                    {t.dispatch}
                                  </Link>
                                </Button>
                                <TeamUnbindMenuButton
                                  teamId={team.id}
                                  characterIds={team.characterIds}
                                  charactersById={charById}
                                  className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Roster */}
            <MobileSection
              eyebrow="Roster"
              title={interpolate(t.rosterTitle, { n: String(characters.length) })}
              action={
                rosterTotalPages > 1 ? (
                  <Pager
                    shared={s}
                    page={rosterPage}
                    totalPages={rosterTotalPages}
                    onPrev={() => setRosterPage((p) => Math.max(0, p - 1))}
                    onNext={() =>
                      setRosterPage((p) =>
                        Math.min(rosterTotalPages - 1, p + 1),
                      )
                    }
                  />
                ) : null
              }
            >
              <div className="grid grid-cols-3 gap-2">
                {rosterPaged.map((c) => {
                  const used = inUse.has(c.id)
                  return (
                    <div key={c.id} className={used ? "opacity-50" : ""}>
                      <CharacterCard character={c} size="sm" />
                      {used ? (
                        <p className="mt-1 text-center text-[9px] text-muted-foreground">
                          {t.assigned}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </MobileSection>
          </div>
        )}
      </main>

      {/* 创建队伍 — 移动端全屏 dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          className="flex max-h-[92vh] max-w-[95vw] flex-col"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{t.createTeam}</DialogTitle>
            <DialogDescription className="text-xs">{t.dialogLead}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="m-team-name">{t.teamNameLabel}</FieldLabel>
              <Input
                id="m-team-name"
                placeholder={interpolate(t.teamNamePlaceholder, { n: String(teams.length + 1) })}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={20}
              />
            </Field>
          </FieldGroup>

          <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2 text-sm">
            <div>
              {interpolate(t.selectedCount, { n: String(selected.length) })}
            </div>
            <div>
              {t.estPowerShort}{" "}
              <span className="font-mono text-primary">{previewPower}</span>
            </div>
          </div>

          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {available.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t.noFree}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {availablePaged.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      selectable
                      selected={selected.includes(c.id)}
                      disabled={
                        !selected.includes(c.id) && selected.length >= 3
                      }
                      onSelect={() => togglePick(c.id)}
                      size="sm"
                    />
                  ))}
                </div>
                {availableTotalPages > 1 ? (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground">
                      {interpolate(t.freeCount, { n: String(available.length) })}
                    </span>
                    <Pager
                      shared={s}
                      page={availablePage}
                      totalPages={availableTotalPages}
                      onPrev={() =>
                        setAvailablePage((p) => Math.max(0, p - 1))
                      }
                      onNext={() =>
                        setAvailablePage((p) =>
                          Math.min(availableTotalPages - 1, p + 1),
                        )
                      }
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCreating(false)}
              className="flex-1"
            >
              {s.cancel}
            </Button>
            <Button
              onClick={submit}
              disabled={selected.length !== 3}
              className="flex-1 gap-2"
            >
              <Users className="size-4" aria-hidden />
              {s.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamFormationModal
        open={pactOpen}
        members={selectedChars}
        teamName={teamName}
        onConfirm={sealPact}
        onCancel={cancelPact}
      />
    </>
  )
}

function Pager({
  shared: s,
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  shared: { prevPageAria: string; nextPageAria: string }
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={page === 0}
        aria-label={s.prevPageAria}
        className="size-7"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
      </Button>
      <span className="min-w-12 text-center font-mono text-[10px] text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        aria-label={s.nextPageAria}
        className="size-7"
      >
        <ChevronRight className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}
