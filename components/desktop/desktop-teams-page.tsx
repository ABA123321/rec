"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Sword,
  Trash2,
  Users,
} from "lucide-react"

import { TopBar } from "@/components/game/top-bar"
import { CharacterCard } from "@/components/game/character-card"
import { TeamFormationModal } from "@/components/game/team-formation-modal"
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

export function DesktopTeamsPage() {
  const { characters, teams, createTeam, disbandTeam, connected, connect } = useGame()
  const { messages: loc } = useLocale()
  const t = loc.game.teams
  const s = loc.game.shared

  const [creating, setCreating] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>([])
  const [teamName, setTeamName] = React.useState("")
  // 组队仪式动画
  const [pactOpen, setPactOpen] = React.useState(false)

  const inUse = React.useMemo(() => new Set(teams.flatMap((t) => t.characterIds)), [teams])
  const available = React.useMemo(
    () => characters.filter((c) => !inUse.has(c.id)),
    [characters, inUse],
  )

  // ─── 分页：roster 全部冒险者 + 创建弹窗里的 available 各自独立 ───
  const ROSTER_PAGE = 9
  const AVAILABLE_PAGE = 16
  const TEAMS_PAGE = 2
  const [rosterPage, setRosterPage] = React.useState(0)
  const [availablePage, setAvailablePage] = React.useState(0)
  const [teamsPage, setTeamsPage] = React.useState(0)

  // 当总数变化（召唤新角色 / 解散队伍）时把页码 clamp 回有效范围，避免出现空白页
  const rosterTotalPages = Math.max(1, Math.ceil(characters.length / ROSTER_PAGE))
  const availableTotalPages = Math.max(1, Math.ceil(available.length / AVAILABLE_PAGE))
  const teamsTotalPages = Math.max(1, Math.ceil(teams.length / TEAMS_PAGE))
  React.useEffect(() => {
    if (rosterPage >= rosterTotalPages) setRosterPage(rosterTotalPages - 1)
  }, [rosterPage, rosterTotalPages])
  React.useEffect(() => {
    if (availablePage >= availableTotalPages) setAvailablePage(availableTotalPages - 1)
  }, [availablePage, availableTotalPages])
  React.useEffect(() => {
    if (teamsPage >= teamsTotalPages) setTeamsPage(teamsTotalPages - 1)
  }, [teamsPage, teamsTotalPages])

  const rosterPaged = React.useMemo(
    () => characters.slice(rosterPage * ROSTER_PAGE, (rosterPage + 1) * ROSTER_PAGE),
    [characters, rosterPage],
  )
  const availablePaged = React.useMemo(
    () => available.slice(availablePage * AVAILABLE_PAGE, (availablePage + 1) * AVAILABLE_PAGE),
    [available, availablePage],
  )
  const teamsPaged = React.useMemo(
    () => teams.slice(teamsPage * TEAMS_PAGE, (teamsPage + 1) * TEAMS_PAGE),
    [teams, teamsPage],
  )

  const togglePick = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id],
    )
  }

  const charById = React.useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])
  const selectedChars = selected.map((id) => charById.get(id)).filter(Boolean) as Character[]
  const previewPower = selectedChars.reduce((s, c) => s + c.power, 0)

  // 第一步：用户点击"确认组队" → 关闭选人对话框，打开仪式动画
  const submit = () => {
    if (selected.length !== 3) return
    setCreating(false)
    setPactOpen(true)
  }

  // 第二步：仪式动画结束后用户点击"缔结契约" → 真正创建队伍
  const sealPact = async () => {
    if (selected.length !== 3) return
    const ok = await createTeam(selected as [string, string, string], teamName)
    if (ok) {
      setPactOpen(false)
      setSelected([])
      setTeamName("")
    }
  }

  // 取消仪式 → 返回选人界面
  const cancelPact = () => {
    setPactOpen(false)
    setCreating(true)
  }

  return (
    <>
      <TopBar
        title={t.title}
        description={interpolate(t.descDesktop, { max: String(MAX_TEAMS_PER_ACCOUNT) })}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {!connected ? (
          <UnconnectedHint onConnect={connect} shared={s} />
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Squads</p>
                <h2 className="font-serif text-xl sm:text-2xl">
                  {t.myTeams}{" "}
                  <span className="text-sm text-muted-foreground sm:text-base">
                    ({teams.length}/{MAX_TEAMS_PER_ACCOUNT})
                  </span>
                </h2>
              </div>
              <Button
                onClick={() => setCreating(true)}
                disabled={teams.length >= MAX_TEAMS_PER_ACCOUNT || available.length < 3}
                className="gap-2"
                size="sm"
              >
                <Plus className="size-4" aria-hidden />
                {t.createTeam}
              </Button>
            </div>

            {teams.length === 0 ? (
              <Empty className="border border-dashed border-border bg-card/40">
                <EmptyHeader>
                  <EmptyTitle>{t.emptyTeamsTitle}</EmptyTitle>
                  <EmptyDescription>{t.emptyTeamsDesc}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {teamsPaged.map((team) => {
                    const members = team.characterIds
                      .map((id) => charById.get(id))
                      .filter(Boolean) as Character[]
                    const power = members.reduce((s, c) => s + c.power, 0)
                    const cooling = team.cooldownUntil > Date.now()
                    const remaining = cooling
                      ? Math.ceil((team.cooldownUntil - Date.now()) / 60_000)
                      : 0

                    return (
                      <li key={team.id}>
                        <Card className="border-border bg-card/60">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-serif text-lg">{team.name}</h3>
                                <p className="font-mono text-xs text-muted-foreground">{team.id}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {t.totalPower}
                                </div>
                                <div className="font-mono text-2xl text-primary">{power}</div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {members.map((member) => (
                                <CharacterCard key={member.id} character={member} size="sm" />
                              ))}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                              <div
                                className={`flex items-center gap-2 text-xs sm:text-sm ${
                                  cooling ? "text-muted-foreground" : "text-chart-2"
                                }`}
                              >
                                <span
                                  className={`size-2 rounded-full ${
                                    cooling ? "bg-muted-foreground" : "bg-chart-2 shadow-[0_0_8px_currentColor]"
                                  }`}
                                  aria-hidden
                                />
                                {cooling
                                  ? interpolate(t.cooldownDesktop, { m: String(remaining) })
                                  : t.idle}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  asChild
                                  size="sm"
                                  disabled={cooling}
                                  variant={cooling ? "outline" : "default"}
                                  className="gap-1"
                                >
                                  <Link href="/game/dungeons">
                                    <Sword className="size-3.5" aria-hidden />
                                    {t.dispatch}
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-destructive hover:text-destructive"
                                  onClick={() => disbandTeam(team.id)}
                                >
                                  <Trash2 className="size-3.5" aria-hidden />
                                  {t.disband}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
                {teamsTotalPages > 1 ? (
                  <div className="flex items-center justify-end gap-3 mt-4">
                    <Pager
                      shared={s}
                      page={teamsPage}
                      totalPages={teamsTotalPages}
                      onPrev={() => setTeamsPage((p) => Math.max(0, p - 1))}
                      onNext={() => setTeamsPage((p) => Math.min(teamsTotalPages - 1, p + 1))}
                    />
                  </div>
                ) : null}
              </>
            )}

            {/* Roster */}
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Roster
                  </p>
                  <h2 className="font-serif text-xl">
                    {t.rosterTitleDesktop}{" "}
                    <span className="text-sm text-muted-foreground">
                      ({characters.length})
                    </span>
                  </h2>
                </div>
                {rosterTotalPages > 1 ? (
                  <Pager
                    shared={s}
                    page={rosterPage}
                    totalPages={rosterTotalPages}
                    onPrev={() => setRosterPage((p) => Math.max(0, p - 1))}
                    onNext={() => setRosterPage((p) => Math.min(rosterTotalPages - 1, p + 1))}
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {rosterPaged.map((c) => {
                  const used = inUse.has(c.id)
                  return (
                    <div key={c.id} className={used ? "opacity-50" : ""}>
                      <CharacterCard character={c} size="sm" />
                      {used ? (
                        <p className="mt-1 text-center text-[10px] text-muted-foreground">
                          {t.assignedDesktop}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Create team dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{t.createTeam}</DialogTitle>
            <DialogDescription>{t.dialogLead}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="team-name">{t.teamNameLabel}</FieldLabel>
              <Input
                id="team-name"
                placeholder={interpolate(t.teamNamePlaceholder, { n: String(teams.length + 1) })}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={20}
              />
            </Field>
          </FieldGroup>

          <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-2">
            <div className="text-sm">
              {interpolate(t.selectedCount, { n: String(selected.length) })}
            </div>
            <div className="text-sm">
              {t.estPower}{" "}
              <span className="font-mono text-primary">{previewPower}</span>
            </div>
          </div>

          <div className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t.noFree}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {availablePaged.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      selectable
                      selected={selected.includes(c.id)}
                      disabled={!selected.includes(c.id) && selected.length >= 3}
                      onSelect={() => togglePick(c.id)}
                      size="sm"
                    />
                  ))}
                </div>
                {availableTotalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {interpolate(t.freeCountDesktop, { n: String(available.length) })}
                    </span>
                    <Pager
                      shared={s}
                      page={availablePage}
                      totalPages={availableTotalPages}
                      onPrev={() => setAvailablePage((p) => Math.max(0, p - 1))}
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

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreating(false)}>
              {s.cancel}
            </Button>
            <Button onClick={submit} disabled={selected.length !== 3} className="gap-2">
              <Users className="size-4" aria-hidden />
              {t.confirmCreateTeam}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 组队仪式动画 */}
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

function UnconnectedHint({
  onConnect,
  shared: s,
}: {
  onConnect: () => void
  shared: { pleaseConnect: string; teamSaveHint: string; connectWallet: string }
}) {
  return (
    <Empty className="border border-dashed border-border bg-card/40">
      <EmptyHeader>
        <EmptyTitle>{s.pleaseConnect}</EmptyTitle>
        <EmptyDescription>{s.teamSaveHint}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onConnect}>{s.connectWallet}</Button>
      </EmptyContent>
    </Empty>
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
        className="size-8"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <span className="min-w-16 text-center font-mono text-xs text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        aria-label={s.nextPageAria}
        className="size-8"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

// Re-export to silence unused-warning if rarity needed