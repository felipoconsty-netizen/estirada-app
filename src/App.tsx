import { useEffect, useMemo, useState } from 'react'
import { WEEKS, type Injury, type Player, type Team } from '@/lib/data'
import { derive, deriveTeam, firstName, fmt, mondaySummary, signed, wellnessScore, type Level, type PlayerView } from '@/lib/derive'
import { DICT, zone, type Dict } from '@/lib/i18n'
import { ageAt, growthVelocity, maturityOffset, phaseOf, RECOS, type Lang, type Measure } from '@/lib/phv'
import { answerOf, conclusions, DIMS, surveyWeeks } from '@/lib/survey'
import { InstallButton } from '@/components/Install'
import { GrowthChart, MaturityMap, OffsetGauge, Sparkline, WellnessChart } from '@/components/Charts'

type Tab = 'team' | 'player' | 'measure' | 'survey' | 'family' | 'club' | 'manage'

export function Chip({ level, children }: { level: Level; children: React.ReactNode }) {
  return <span className={`chip lv-${level}`}><span className="dot" />{children}</span>
}

export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="var(--fg)" />
      <path d="M7 22 C 12 21, 13 9, 23 8" stroke="var(--bg)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="8" r="2.6" fill="var(--accent)" />
    </svg>
  )
}

export interface Actions {
  saveMeasure: (playerId: string, m: Measure) => Promise<void>
  addInjury: (playerId: string, i: Injury) => Promise<void>
  setInjuryStatus: (id: string, status: Injury['status']) => Promise<void>
  newSurveyLink: (teamId: string) => Promise<void>
  deleteMeasure: (playerId: string, date: string) => Promise<void>
}

export interface WorkspaceProps {
  demo: boolean
  teams: (Team & { survey_token?: string })[]
  club: { name: string; town: string }
  today: string
  actions?: Actions
  manage?: (p: { t: Dict; lang: Lang; teams: Team[]; toast: (s: string) => void }) => React.ReactNode
  account?: React.ReactNode
  banner?: React.ReactNode
}

export const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }
/** Dilluns de la setmana d'una data ISO, com a etiqueta d/m. */
/** Setmana del qüestionari (el seu dilluns). Es respon en diumenge, així que de dilluns a dissabte encara es mira la setmana anterior. */
export function mondayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 6); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => { try { return (localStorage.getItem('lang') as Lang) || 'ca' } catch { return 'ca' } })
  useEffect(() => { try { localStorage.setItem('lang', lang) } catch { /* sense emmagatzematge */ } document.documentElement.lang = lang }, [lang])
  return [lang, setLang] as const
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex rounded-lg p-0.5" style={{ background: 'var(--surface-2)' }} role="group" aria-label="Idioma">
      {(['ca', 'es'] as Lang[]).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className="px-2.5 py-1 rounded-md text-[12px] font-mono font-medium uppercase"
          style={lang === l ? { background: 'var(--surface)', color: 'var(--fg)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: 'var(--muted)' }}>{l}</button>
      ))}
    </div>
  )
}

export function Brand({ sub }: { sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <div className="font-display text-[22px] font-bold tracking-tight">Estirada</div>
        {sub && <div className="text-[12px] muted">{sub}</div>}
      </div>
    </div>
  )
}

export default function Workspace({ demo, teams: initial, club, today, actions, manage, account, banner, lang, setLang }: WorkspaceProps & { lang: Lang; setLang: (l: Lang) => void }) {
  const [tab, setTab] = useState<Tab>(initial.length ? 'team' : 'manage')
  const [teams, setTeams] = useState(initial)
  const [teamId, setTeamId] = useState(initial[0]?.id ?? '')
  const [playerId, setPlayerId] = useState(initial[0]?.players[0]?.id ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const t = DICT[lang]

  useEffect(() => setTeams(initial), [initial])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2600); return () => clearTimeout(id) }, [toast])

  const team = teams.find((x) => x.id === teamId) ?? teams[0]
  const views = useMemo(() => (team ? deriveTeam(team, lang) : []), [team, lang])
  const player = team?.players.find((p) => p.id === playerId) ?? team?.players[0]

  const updatePlayer = (id: string, fn: (p: Player) => Player) =>
    setTeams((ts) => ts.map((tm) => ({ ...tm, players: tm.players.map((p) => (p.id === id ? fn(p) : p)) })))
  const run = async (fn: () => Promise<void>, ok?: string) => {
    try { await fn(); if (ok) setToast(ok) } catch (e) { console.error(e); setToast(t.error) }
  }

  const openPlayer = (id: string) => { setPlayerId(id); setTab('player'); window.scrollTo({ top: 0 }) }
  const openMeasure = (id: string) => { setPlayerId(id); setTab('measure'); window.scrollTo({ top: 0 }) }
  const pickTeam = (id: string) => { setTeamId(id); setPlayerId(teams.find((x) => x.id === id)?.players[0]?.id ?? '') }

  const tabs: [Tab, string][] = [['team', t.nav_team], ['player', t.nav_player], ['measure', t.nav_measure], ['survey', t.nav_survey], ['family', t.nav_family], ['club', t.nav_club]]
  if (manage) tabs.push(['manage', t.nav_manage])
  const needsPlayers = tab !== 'manage' && tab !== 'club' && tab !== 'team'

  return (
    <div className="min-h-full">
      {banner}
      <header className="line-b" style={{ background: 'var(--surface)' }}>
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Brand sub={t.tagline} />
          <nav className="order-3 md:order-2 w-full md:w-auto flex gap-1 overflow-x-auto -mx-1 px-1" aria-label="Seccions">
            {tabs.map(([k, label]) => (
              <button key={k} className="tab" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>{label}</button>
            ))}
          </nav>
          <div className="order-2 md:order-3 ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-[12px] muted">{club.name}</span>
            <InstallButton lang={lang} compact />
            <LangToggle lang={lang} setLang={setLang} />
            {account}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 md:px-6 py-6 md:py-8 fade-in" key={tab + lang}>
        {tab === 'manage' && manage ? manage({ t, lang, teams, toast: setToast })
          : !team ? <Empty t={t} text={t.no_teams} action={manage ? () => setTab('manage') : undefined} />
          : needsPlayers && !player ? <Empty t={t} text={t.no_players} action={manage ? () => setTab('manage') : undefined} />
          : <>
            {tab === 'team' && <TeamView t={t} lang={lang} demo={demo} today={today} teams={teams} team={team} views={views} pickTeam={pickTeam} openPlayer={openPlayer} openMeasure={openMeasure} goManage={manage ? () => setTab('manage') : undefined} />}
            {tab === 'player' && player && <PlayerScreen t={t} lang={lang} today={today} team={team} player={player} setPlayerId={setPlayerId} goFamily={() => setTab('family')} goMeasure={() => openMeasure(player.id)}
              onAddInjury={(i) => (demo ? updatePlayer(player.id, (p) => ({ ...p, injuries: [i, ...p.injuries] })) : run(() => actions!.addInjury(player.id, i), t.done))}
              onDeleteMeasure={(date) => {
                updatePlayer(player.id, (p) => ({ ...p, measures: p.measures.filter((x) => x.date !== date) }))
                if (!demo) run(() => actions!.deleteMeasure(player.id, date), t.done)
              }}
              onInjuryStatus={(i, st) => (demo ? updatePlayer(player.id, (p) => ({ ...p, injuries: p.injuries.map((x) => (x === i ? { ...x, status: st } : x)) })) : run(() => actions!.setInjuryStatus(i.id!, st)))} />}
            {tab === 'measure' && player && <MeasureView t={t} lang={lang} demo={demo} today={today} team={team} initialId={player.id}
              onSave={(id, m) => {
                updatePlayer(id, (p) => ({ ...p, measures: [...p.measures.filter((x) => x.date !== m.date), m].sort((a, b) => a.date.localeCompare(b.date)) }))
                if (demo) setToast(t.saved); else run(() => actions!.saveMeasure(id, m), t.saved)
              }} />}
            {tab === 'survey' && (demo
              ? <SurveyView t={t} lang={lang} team={team} onSend={(id, w) => updatePlayer(id, (p) => ({ ...p, wellness: [...p.wellness.slice(0, -1), w] }))} openPlayer={openPlayer} />
              : <SurveyShare t={t} lang={lang} today={today} team={team} openPlayer={openPlayer} toast={setToast} onNewLink={() => run(() => actions!.newSurveyLink(team.id))} />)}
            {tab === 'family' && player && <FamilyView t={t} lang={lang} club={club} team={team} player={player} setPlayerId={setPlayerId} goMeasure={() => openMeasure(player.id)} />}
            {tab === 'club' && <ClubView t={t} lang={lang} club={club} teams={teams} openTeam={(id) => { pickTeam(id); setTab('team') }} />}
          </>}
      </main>

      <footer className="mx-auto max-w-[1180px] px-4 md:px-6 pb-10 text-[12px] faint">{demo ? t.disclaimer : t.disclaimer_real}</footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Empty({ t, text, action }: { t: Dict; text: string; action?: () => void }) {
  return (
    <div className="card p-8 grid gap-4 justify-items-start max-w-[560px]">
      <p className="text-[16px]">{text}</p>
      {action && <button className="btn" onClick={action}>{t.nav_manage} →</button>}
    </div>
  )
}

/* ───────────── El meu equip ───────────── */

function TeamPicker({ teams, team, pickTeam }: { teams: Team[]; team: Team; pickTeam: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {teams.map((x) => <button key={x.id} className="pill text-[13px]" aria-pressed={x.id === team.id} onClick={() => pickTeam(x.id)}>{x.name}</button>)}
    </div>
  )
}

function TeamView({ t, lang, demo, today, teams, team, views, pickTeam, openPlayer, openMeasure, goManage }: { t: Dict; lang: Lang; demo: boolean; today: string; teams: Team[]; team: Team; views: PlayerView[]; pickTeam: (id: string) => void; openPlayer: (id: string) => void; openMeasure: (id: string) => void; goManage?: () => void }) {
  const summary = mondaySummary(views, lang)
  const thisWeek = mondayLabel(today)
  const answered = demo ? views.length - 1 : team.players.filter((p) => p.wellness.at(-1)?.week === thisWeek).length
  const total = demo ? views.length : team.players.length
  const unmeasured = team.players.filter((p) => !p.measures.length)
  const peak = views.filter((v) => v.phase.key === 'plena').length
  const red = views.filter((v) => v.level === 'bad').length
  const sorted = [...views].sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.level] - { bad: 0, warn: 1, ok: 2 }[b.level]) || a.offset - b.offset)
  const labels = { before: t.before, peak: t.peak, after: t.after }
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="label">{team.sport}{team.coach ? ` · ${demo ? '' : `${t.coach_label}: `}${team.coach}` : ''}</div>
          <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{team.name}</h1>
        </div>
        <TeamPicker teams={teams} team={team} pickTeam={pickTeam} />
      </div>

      {team.players.length === 0 && <Empty t={t} text={t.no_players} action={goManage} />}
      {team.players.length > 0 && <>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="card p-5 grid gap-3 content-start" aria-labelledby="monday">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 id="monday" className="font-display text-[20px] font-bold">{t.monday}</h2>
            <span className="label">{demo ? t.week_of : `${t.week_of_fn} ${thisWeek}`}</span>
          </div>
          <p className="muted text-[14px] -mt-2">{t.monday_sub}</p>
          <ul className="grid gap-2.5">
            {summary.map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-[7px] w-2 h-2 rounded-full flex-none" style={{ background: s.level === 'bad' ? 'var(--bad)' : s.level === 'warn' ? 'var(--warn)' : 'var(--ok)' }} />
                <span className="text-[15px]">{s.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="grid grid-cols-3 gap-3 content-start">
          {[[team.players.length, t.players, 'fg'], [peak, t.in_peak, 'bad'], [red, t.red_alerts, 'bad']].map(([n, l, c], i) => (
            <div key={i} className="card p-4 grid gap-1">
              <div className="font-display text-[34px] font-bold leading-none num" style={{ color: c === 'bad' && Number(n) > 0 ? 'var(--bad)' : 'var(--fg)' }}>{n}</div>
              <div className="text-[12.5px] muted leading-snug">{l}</div>
            </div>
          ))}
          <div className="card p-4 col-span-3 grid gap-2">
            <div className="flex justify-between text-[13px]"><span className="muted">{t.answered}</span><span className="font-mono num">{answered}/{total}</span></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${total ? (answered / total) * 100 : 0}%`, background: 'var(--accent)' }} />
            </div>
          </div>
        </div>
      </div>

      <section className="card p-5 grid gap-2">
        <h2 className="font-display text-[20px] font-bold">{t.map_title}</h2>
        <p className="muted text-[14px]">{t.map_sub}</p>
        {views.length > 0 ? <MaturityMap views={views} onPick={openPlayer} labels={labels} /> : <p className="muted text-[14px]">{t.no_measures}</p>}
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="grid-t min-w-[860px]">
            <thead>
              <tr>
                {[t.col_player, t.col_age, t.col_offset, t.col_phase, t.col_growth, t.col_well, t.col_alerts].map((h) => <th key={h} className="label">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <tr key={v.p.id} onClick={() => openPlayer(v.p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openPlayer(v.p.id)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: `var(--${v.level})` }} aria-hidden="true" />
                      <span className="font-medium">{v.p.name}</span>
                    </div>
                  </td>
                  <td className="num font-mono text-[13px]">{fmt(v.age)}</td>
                  <td className="num font-mono text-[13px] font-medium">{signed(v.offset)}</td>
                  <td><Chip level={v.phase.level}>{v.phase.label[lang]}</Chip></td>
                  <td className="num font-mono text-[13px]">{v.velocity === null ? '—' : <span className={v.velocity >= 7.5 ? 'tx-warn font-medium' : ''}>{fmt(v.velocity)}</span>}</td>
                  <td>{v.wellnessSeries.length >= 2 ? <Sparkline values={v.wellnessSeries} painWeeks={v.p.wellness.map((w) => !!w.pain)} /> : <span className="faint">—</span>}</td>
                  <td className="text-[13px] max-w-[260px]">
                    {v.alerts.filter((a) => a.level !== 'info' && !a.text.startsWith(v.phase.label[lang])).slice(0, 2).map((a, i) => (
                      <div key={i} className={`tx-${a.level === 'bad' ? 'bad' : 'warn'}`}>{a.text}</div>
                    ))}
                    {v.alerts.filter((a) => a.level !== 'info' && !a.text.startsWith(v.phase.label[lang])).length === 0 && <span className="faint">—</span>}
                  </td>
                </tr>
              ))}
              {unmeasured.map((p) => (
                <tr key={p.id} onClick={() => openMeasure(p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openMeasure(p.id)}>
                  <td><div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: 'var(--faint)' }} aria-hidden="true" /><span className="font-medium">{p.name}</span></div></td>
                  <td className="num font-mono text-[13px]">{fmt(ageAt(p.dob, today))}</td>
                  <td className="faint">—</td>
                  <td><span className="chip"><span className="dot" />{t.not_measured}</span></td>
                  <td className="faint">—</td><td className="faint">—</td>
                  <td className="text-[13px]"><span style={{ color: 'var(--accent)' }}>{t.measure_now} →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>}
    </div>
  )
}

/* ───────────── Fitxa ───────────── */

function PlayerSelect({ t, team, player, setPlayerId }: { t: Dict; team: Team; player: Player; setPlayerId: (id: string) => void }) {
  return (
    <label className="field min-w-[220px]">
      <span className="label">{t.choose_player}</span>
      <select value={player.id} onChange={(e) => setPlayerId(e.target.value)}>
        {team.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  )
}

function PlayerScreen({ t, lang, today, team, player, setPlayerId, goFamily, goMeasure, onAddInjury, onInjuryStatus, onDeleteMeasure }: { t: Dict; lang: Lang; today: string; team: Team; player: Player; setPlayerId: (id: string) => void; goFamily: () => void; goMeasure: () => void; onAddInjury: (i: Injury) => void; onInjuryStatus: (i: Injury, s: Injury['status']) => void; onDeleteMeasure: (date: string) => void }) {
  const v = derive(player, lang)
  if (!v) return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2"><div className="label">{team.name}</div><h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{player.name}</h1><span className="muted text-[14px]">{fmt(ageAt(player.dob, today))} {t.years}</span></div>
        <PlayerSelect t={t} team={team} player={player} setPlayerId={setPlayerId} />
      </div>
      <div className="card p-6 grid gap-4 justify-items-start max-w-[560px]"><p>{t.no_measures}</p><button className="btn" onClick={goMeasure}>{t.measure_now} →</button></div>
    </div>
  )
  const reco = RECOS[lang][v.phase.key]
  const left = Math.max(0, v.target - v.height)
  const cols: [keyof typeof reco, string, Level][] = [['prioritzar', t.prioritzar, 'ok'], ['moderar', t.moderar, 'warn'], ['evitar', t.evitar, 'bad'], ['vigilar', t.vigilar, 'info']]
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <div className="label">{team.name}</div>
          <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{player.name}</h1>
          <div className="flex flex-wrap items-center gap-2"><Chip level={v.phase.level}>{v.phase.label[lang]}</Chip><span className="muted text-[14px]">{fmt(v.age)} {t.years}</span></div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <PlayerSelect t={t} team={team} player={player} setPlayerId={setPlayerId} />
          <button className="btn-ghost" onClick={goFamily}>{t.family_title} →</button>
        </div>
      </div>

      <section className="card p-5 grid gap-5">
        <div className="grid gap-1">
          <div className="label">Maturity offset</div>
          <div className="font-display text-[44px] font-bold leading-none num">{signed(v.offset)} <span className="text-[18px] font-medium muted">{t.years}</span></div>
        </div>
        <OffsetGauge offset={v.offset} labels={{ before: t.before, peak: t.peak, after: t.after }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 line-t pt-4">
          {[[t.phv_age, `${fmt(v.phvAge)} ${t.years}`], [t.height, `${fmt(v.height)} cm`], [t.target, `${fmt(v.target, 0)} cm`], [`% ${t.pct_adult}`, `${fmt(v.pctAdult)} %`]].map(([l, val]) => (
            <div key={l} className="grid gap-1"><div className="text-[12.5px] muted">{l}</div><div className="font-mono text-[18px] font-medium num">{val}</div></div>
          ))}
        </div>
        <p className="text-[14px] muted">{t.left} ~{fmt(left, 0)} cm.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5 grid gap-3 content-start">
          <h2 className="font-display text-[20px] font-bold">{t.alerts_title}</h2>
          {v.alerts.length === 0 && <p className="muted">{t.none}</p>}
          <ul className="grid gap-2">
            {v.alerts.map((a, i) => <li key={i}><Chip level={a.level}>{a.text}</Chip></li>)}
          </ul>
        </section>
        <section className="card p-5 grid gap-3 content-start">
          <h2 className="font-display text-[20px] font-bold">{t.injuries}</h2>
          {player.injuries.length === 0 ? <p className="muted text-[14px]">{t.no_injuries}</p> : (
            <ul className="grid gap-2">
              {player.injuries.map((inj, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                  <span className="font-mono text-[12.5px] muted">{new Date(inj.date).toLocaleDateString('es-ES')}</span>
                  <span className="font-medium">{zone(inj.zone, lang)}</span>
                  <span className="muted">{inj.note}</span>
                  <Chip level={inj.status === 'oberta' ? 'warn' : 'ok'}>{inj.status === 'oberta' ? t.open : t.closed}</Chip>
                  <button className="text-[12.5px] underline muted" onClick={() => onInjuryStatus(inj, inj.status === 'oberta' ? 'tancada' : 'oberta')}>{inj.status === 'oberta' ? t.close_inj : t.reopen}</button>
                </li>
              ))}
            </ul>
          )}
          <InjuryForm t={t} lang={lang} today={today} onAdd={onAddInjury} />
        </section>
      </div>

      <section className="card p-5 grid gap-4">
        <h2 className="font-display text-[20px] font-bold">{t.recos_title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cols.map(([k, label, lvl]) => (
            <div key={k} className="grid gap-2 content-start">
              <div className={`label tx-${lvl === 'info' ? 'acc' : lvl}`} style={{ color: lvl === 'info' ? 'var(--accent)' : undefined }}>{label}</div>
              <ul className="grid gap-1.5 text-[14px]">
                {reco[k].map((r) => <li key={r} className="pl-3 relative"><span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--faint)' }} />{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 grid gap-2">
          <h2 className="font-display text-[18px] font-bold">{t.growth_chart}</h2>
          {player.measures.length >= 2 ? <GrowthChart measures={player.measures} target={v.target} unit="cm" /> : <p className="muted text-[14px]">{t.need_two_m}</p>}
        </section>
        <section className="card p-5 grid gap-2">
          <h2 className="font-display text-[18px] font-bold">{t.well_chart}</h2>
          {v.wellnessSeries.length >= 2 ? <WellnessChart values={v.wellnessSeries} weeks={player.wellness.map((w) => w.week)} pain={player.wellness.map((w) => (w.pain ? w.pain.level : null))} painLabel="dolor" /> : <p className="muted text-[14px]">{t.need_two}</p>}
          {v.wellnessSeries.length >= 2 && <div className="flex items-center gap-2 text-[12px] muted"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--bad)' }} />{t.pain_week}</div>}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
          <h2 className="font-display text-[18px] font-bold">{t.history}</h2>
          <button className="btn-ghost text-[13px]" onClick={goMeasure}>+ {t.nav_measure}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="grid-t min-w-[560px]">
            <thead><tr>{[t.measure_date, t.m_height, t.m_sitting, t.m_mass, t.col_offset, ''].map((h, i) => <th key={i} className="label">{h}</th>)}</tr></thead>
            <tbody>
              {[...player.measures].reverse().map((m) => {
                const o = maturityOffset(player.sex, ageAt(player.dob, m.date), m)
                return (
                  <tr key={m.date} style={{ cursor: 'default' }}>
                    <td className="font-mono text-[13px]">{new Date(m.date + 'T12:00:00').toLocaleDateString('es-ES')}</td>
                    <td className="num font-mono text-[13px]">{fmt(m.height)}</td>
                    <td className="num font-mono text-[13px]">{fmt(m.sitting)}</td>
                    <td className="num font-mono text-[13px]">{fmt(m.mass)}</td>
                    <td className="num font-mono text-[13px]">{signed(o)}</td>
                    <td className="text-right"><button className="text-[13px] underline tx-bad" onClick={() => confirm(t.delete_measure_q) && onDeleteMeasure(m.date)}>{t.delete}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

const ZONES = ['Genoll', 'Taló', 'Turmell', 'Esquena', 'Maluc', 'Espatlla', 'Canell']

function InjuryForm({ t, lang, today, onAdd }: { t: Dict; lang: Lang; today: string; onAdd: (i: Injury) => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [z, setZ] = useState(ZONES[0])
  const [note, setNote] = useState('')
  if (!open) return <button className="btn-ghost justify-self-start" onClick={() => setOpen(true)}>+ {t.add_injury}</button>
  return (
    <form className="grid gap-3 sm:grid-cols-3 line-t pt-3" onSubmit={(e) => { e.preventDefault(); onAdd({ date, zone: z, note: note.trim(), status: 'oberta' }); setOpen(false); setNote('') }}>
      <label className="field"><span className="text-[13px] font-medium">{t.inj_date}</span><input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required /></label>
      <label className="field"><span className="text-[13px] font-medium">{t.inj_zone}</span><select value={z} onChange={(e) => setZ(e.target.value)}>{ZONES.map((x) => <option key={x} value={x}>{zone(x, lang)}</option>)}</select></label>
      <label className="field"><span className="text-[13px] font-medium">{t.inj_note}</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="sm:col-span-3 flex gap-2"><button className="btn" type="submit">{t.save_btn}</button><button className="btn-ghost" type="button" onClick={() => setOpen(false)}>{t.cancel}</button></div>
    </form>
  )
}

/* ───────────── Mesurar ───────────── */

function MeasureView({ t, lang, demo, today, team, initialId, onSave }: { t: Dict; lang: Lang; demo: boolean; today: string; team: Team; initialId: string; onSave: (id: string, m: Measure) => void }) {
  const [id, setId] = useState(initialId)
  const [date, setDate] = useState(today)
  const p = team.players.find((x) => x.id === id) ?? team.players[0]
  const prev = p.measures.filter((m) => m.date < date).at(-1)
  const sameDay = p.measures.find((m) => m.date === date)
  const seed = () => {
    const base = sameDay ?? (demo && prev ? { height: prev.height + 0.8, sitting: prev.sitting + 0.3, mass: prev.mass + 0.4 } : null)
    return base ? [fmtIn(base.height), fmtIn(base.sitting), fmtIn(base.mass)] : ['', '', '']
  }
  const [h, setH] = useState(() => seed()[0])
  const [s, setS] = useState(() => seed()[1])
  const [m, setM] = useState(() => seed()[2])
  useEffect(() => { const [a, b, c] = seed(); setH(a); setS(b); setM(c) }, [id, date]) // eslint-disable-line react-hooks/exhaustive-deps
  const hv = parseFloat(h.replace(',', '.')), sv = parseFloat(s.replace(',', '.')), mv = parseFloat(m.replace(',', '.'))
  const valid = hv > 100 && hv < 230 && sv > 50 && sv < hv && mv > 20 && mv < 150 && !!date && date <= today
  const age = ageAt(p.dob, date)
  const off = valid ? maturityOffset(p.sex, age, { height: hv, sitting: sv, mass: mv }) : null
  const ph = off !== null ? phaseOf(off) : null
  const vel = valid ? growthVelocity([...p.measures.filter((x) => x.date < date), { date, height: hv, sitting: sv, mass: mv }]) : null
  const done = (pl: Player) => pl.measures.some((x) => x.date === date)
  const next = () => { const i = team.players.findIndex((x) => x.id === id); setId(team.players[(i + 1) % team.players.length].id) }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <div className="label">{team.name}</div>
        <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.measure_title}</h1>
        <p className="muted">{t.measure_sub}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="card p-2 grid content-start max-h-[560px] overflow-auto">
          {team.players.map((pl) => (
            <button key={pl.id} onClick={() => setId(pl.id)} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left"
              style={pl.id === id ? { background: 'var(--accent-soft)' } : undefined}>
              <span className="font-medium text-[14px]">{pl.name}</span>
              <span className={`text-[12px] ${done(pl) ? 'tx-ok' : 'faint'}`}>{done(pl) ? `✓ ${t.measured_today}` : t.pending}</span>
            </button>
          ))}
        </section>
        <div className="grid gap-4 content-start">
          <section className="card p-5 grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-[24px] font-bold">{p.name}</h2>
              {demo
                ? <span className="font-mono text-[13px] muted">{t.measure_date}: {new Date(date).toLocaleDateString('es-ES')} · {fmt(age)} {t.years}</span>
                : <label className="field"><span className="text-[13px] font-medium">{t.measure_date} · {fmt(age)} {t.years}</span><input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>}
            </div>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (valid) { onSave(p.id, { date, height: hv, sitting: sv, mass: mv }); next() } }}>
              <label className="field"><span className="text-[13px] font-medium">{t.m_height}</span><input id="m-h" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} /></label>
              <label className="field"><span className="text-[13px] font-medium">{t.m_sitting}</span><input id="m-s" inputMode="decimal" value={s} onChange={(e) => setS(e.target.value)} /></label>
              <label className="field"><span className="text-[13px] font-medium">{t.m_mass}</span><input id="m-m" inputMode="decimal" value={m} onChange={(e) => setM(e.target.value)} /></label>
              <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
                <button className="btn" type="submit" disabled={!valid} style={!valid ? { opacity: 0.5 } : undefined}>{t.save}</button>
                {prev && <span className="text-[13px] muted">{t.last_measure}: {fmt(prev.height)} cm · {fmt(prev.sitting)} cm · {fmt(prev.mass)} kg</span>}
              </div>
            </form>
          </section>
          <section className="card p-5 grid gap-4" aria-live="polite">
            <div className="label">{t.result}</div>
            {off !== null && ph ? (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="font-display text-[44px] font-bold leading-none num">{signed(off)}</div>
                  <Chip level={ph.level}>{ph.label[lang]}</Chip>
                  {vel !== null && <span className={`font-mono text-[14px] ${vel >= 7.5 ? 'tx-warn' : 'muted'}`}>{fmt(vel)} {t.cm_year} {t.since_last}</span>}
                </div>
                <OffsetGauge offset={off} labels={{ before: t.before, peak: t.peak, after: t.after }} />
              </>
            ) : <p className="muted">—</p>}
          </section>
          <section className="grid gap-1.5 text-[13.5px] muted px-1">
            <div className="label">{t.how_measure}</div>
            <p>{t.how1}</p><p>{t.how2}</p><p>{t.how3}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
const fmtIn = (n: number) => (Math.round(n * 10) / 10).toString()

/* ───────────── Qüestionari ───────────── */

const FACES = ['😫', '🙁', '😐', '🙂', '😄']

function SurveyView({ t, lang, team, onSend, openPlayer }: { t: Dict; lang: Lang; team: Team; onSend: (id: string, w: Player['wellness'][number]) => void; openPlayer: (id: string) => void }) {
  const [who, setWho] = useState(team.players[1].id)
  const [pain, setPain] = useState(true)
  const [zoneV, setZone] = useState('Genoll')
  const [level, setLevel] = useState(6)
  const [side, setSide] = useState('Dret')
  const [stopped, setStopped] = useState(false)
  const [scores, setScores] = useState({ energy: 2, sleep: 3, legs: 2, stress: 3, mood: 3 })
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const p = team.players.find((x) => x.id === who)!
  const v = derive(p, lang)!
  const zones = ZONES
  const dims: [keyof typeof scores, string][] = [['energy', t.energy], ['sleep', t.sleep], ['legs', t.legs], ['stress', t.stress], ['mood', t.mood]]
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend(who, { week: WEEKS[WEEKS.length - 1], ...scores, pain: pain ? { zone: zoneV, level, side, stopped } : null, comment: comment.trim() || undefined })
    setSent(true)
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <div className="label">{team.name}</div>
        <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.survey_title}</h1>
        <p className="muted">{t.survey_sub}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        <div className="phone mx-auto">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 line-b" style={{ background: 'var(--surface)' }}><Logo /><span className="font-display font-bold">Estirada</span><span className="ml-auto text-[11px] muted">{team.name}</span></div>
          {sent ? (
            <div className="p-6 grid gap-4 text-center min-h-[520px] content-center">
              <div className="text-[44px]">✅</div>
              <p className="font-display text-[20px] font-bold">{t.thanks}</p>
              <button className="btn-ghost justify-self-center" onClick={() => setSent(false)}>↺</button>
            </div>
          ) : (
            <form className="p-4 grid gap-4 max-h-[620px] overflow-y-auto" onSubmit={submit}>
              <label className="field"><span className="text-[13px] font-medium">{t.who}</span>
                <select id="s-who" value={who} onChange={(e) => setWho(e.target.value)}>{team.players.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </label>
              <fieldset className="grid gap-2"><legend className="text-[13px] font-medium mb-2">{t.pain_q}</legend>
                <div className="flex gap-2">{[true, false].map((b) => <button type="button" key={String(b)} className="pill flex-1" aria-pressed={pain === b} onClick={() => setPain(b)}>{b ? t.yes : t.no}</button>)}</div>
              </fieldset>
              {pain && (
                <>
                  <label className="field"><span className="text-[13px] font-medium">{t.where}</span>
                    <select id="s-zone" value={zoneV} onChange={(e) => setZone(e.target.value)}>{zones.map((z) => <option key={z} value={z}>{zone(z, lang)}</option>)}</select>
                  </label>
                  <label className="field"><span className="text-[13px] font-medium flex justify-between">{t.how_much}<span className="font-mono">{level}</span></span>
                    <input id="s-level" type="range" min={0} max={10} value={level} onChange={(e) => setLevel(+e.target.value)} style={{ padding: 0, border: 0, accentColor: 'var(--accent)' }} />
                  </label>
                  <fieldset className="grid gap-2"><legend className="text-[13px] font-medium mb-2">{t.side}</legend>
                    <div className="flex gap-2">{[['Esquerre', t.left_s], ['Dret', t.right_s], ['Tots dos', t.both]].map(([k, l]) => <button type="button" key={k} className="pill flex-1 text-[13px]" aria-pressed={side === k} onClick={() => setSide(k)}>{l}</button>)}</div>
                  </fieldset>
                  <fieldset className="grid gap-2"><legend className="text-[13px] font-medium mb-2">{t.stopped_q}</legend>
                    <div className="flex gap-2">{[true, false].map((b) => <button type="button" key={String(b)} className="pill flex-1" aria-pressed={stopped === b} onClick={() => setStopped(b)}>{b ? t.yes : t.no}</button>)}</div>
                  </fieldset>
                </>
              )}
              {dims.map(([k, l]) => (
                <fieldset key={k} className="grid gap-2"><legend className="text-[13px] font-medium mb-2">{l}</legend>
                  <div className="flex gap-1.5">{FACES.map((f, i) => <button type="button" key={i} className="scale-btn" aria-label={`${l} ${i + 1}`} aria-pressed={scores[k] === i + 1} onClick={() => setScores({ ...scores, [k]: i + 1 })}>{f}</button>)}</div>
                </fieldset>
              ))}
              <label className="field"><span className="text-[13px] font-medium">{t.comment_q}</span>
                <textarea id="s-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <button className="btn justify-center" type="submit">{t.send}</button>
            </form>
          )}
        </div>
        <section className="card p-5 grid gap-4 content-start">
          <div className="grid gap-1">
            <h2 className="font-display text-[20px] font-bold">{t.coach_sees}</h2>
            <p className="muted text-[14px]">{t.coach_sees_sub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{p.name}</span><Chip level={v.phase.level}>{v.phase.label[lang]}</Chip></div>
          <ul className="grid gap-2">{v.alerts.length ? v.alerts.map((a, i) => <li key={i}><Chip level={a.level}>{a.text}</Chip></li>) : <li className="muted">{t.none}</li>}</ul>
          <div className="grid gap-1">
            <div className="label">{t.well_chart}</div>
            <WellnessChart values={v.wellnessSeries} weeks={p.wellness.map((w) => w.week)} pain={p.wellness.map((w) => (w.pain ? w.pain.level : null))} painLabel="dolor" />
          </div>
          <button className="btn-ghost justify-self-start" onClick={() => openPlayer(p.id)}>{t.open_card} →</button>
        </section>
      </div>
    </div>
  )
}

function SurveyShare({ t, lang, today, team, openPlayer, toast, onNewLink }: { t: Dict; lang: Lang; today: string; team: Team & { survey_token?: string }; openPlayer: (id: string) => void; toast: (s: string) => void; onNewLink: () => void }) {
  const link = `${location.origin}/e/${team.survey_token}`
  const current = mondayLabel(today)
  const weeks = useMemo(() => surveyWeeks(team.players, current), [team, current])
  const [week, setWeek] = useState(current)
  const done = team.players.filter((p) => answerOf(p, week))
  const missing = team.players.filter((p) => !answerOf(p, week))
  const notes = useMemo(() => conclusions(team.players, weeks, week, lang), [team, weeks, week, lang])
  const rows = done.map((p) => ({ p, w: answerOf(p, week)! })).sort((a, b) => wellnessScore(a.w) - wellnessScore(b.w))
  const dimLabel = { energy: t.energy, sleep: t.sleep, legs: t.legs, stress: t.stress, mood: t.mood }
  const cell = (n: number) => (n <= 2 ? 'lv-bad' : n === 3 ? 'lv-warn' : '')
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast(t.copied) } catch { toast(link) } }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <div className="label">{team.name}</div>
        <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.survey_title}</h1>
      </div>
      <section className="card p-5 grid gap-4">
        <div className="grid gap-1"><h2 className="font-display text-[20px] font-bold">{t.share_title}</h2><p className="muted text-[14px]">{t.share_sub}</p></div>
        <div className="font-mono text-[13px] p-3 rounded-lg break-all" style={{ background: 'var(--surface-2)' }}>{link}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={copy}>{t.copy}</button>
          <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(`${t.whatsapp_msg} ${link}`)}`} target="_blank" rel="noreferrer">{t.share_whatsapp}</a>
          <button className="btn-ghost" onClick={() => confirm(t.new_link_q) && onNewLink()}>{t.new_link}</button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5 grid gap-3 content-start">
          <div className="flex justify-between items-baseline"><h2 className="font-display text-[18px] font-bold">{t.answered_week}</h2><span className="font-mono num">{done.length}/{team.players.length}</span></div>
          <span className="label">{t.week_of_fn} {week}</span>
          <ul className="grid gap-1.5">{done.map((p) => {
            const w = answerOf(p, week)!
            return <li key={p.id}><button className="flex flex-wrap gap-2 items-center text-left" onClick={() => openPlayer(p.id)}><span className="font-medium">{p.name}</span>{w.pain && <Chip level={w.pain.level >= 4 || w.pain.stopped ? 'bad' : 'warn'}>{zone(w.pain.zone, lang)} {w.pain.level}/10</Chip>}{w.comment && <span className="muted text-[13px]">«{w.comment}»</span>}</button></li>
          })}{done.length === 0 && <li className="muted">—</li>}</ul>
        </section>
        <section className="card p-5 grid gap-3 content-start">
          <h2 className="font-display text-[18px] font-bold">{t.not_answered}</h2>
          <ul className="grid gap-1.5">{missing.map((p) => <li key={p.id} className="muted">{p.name}</li>)}{missing.length === 0 && <li className="tx-ok">✓</li>}</ul>
        </section>
      </div>
      <section className="card p-5 grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1"><h2 className="font-display text-[20px] font-bold">{t.conclusions_title}</h2><p className="muted text-[14px]">{t.conclusions_sub}</p></div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.week_of_fn}>
            {weeks.slice(-6).map((w) => <button key={w} className="pill text-[13px]" aria-pressed={w === week} onClick={() => setWeek(w)}>{w}</button>)}
          </div>
        </div>
        <ul className="grid gap-2">{notes.map((c, i) => <li key={i}><Chip level={c.level}>{c.text}</Chip></li>)}</ul>
      </section>
      <section className="card grid">
        <div className="p-5 pb-3 grid gap-1"><h2 className="font-display text-[20px] font-bold">{t.answers_title} · {t.week_of_fn.toLowerCase()} {week}</h2><p className="muted text-[14px]">{t.answers_sub}</p></div>
        <div className="overflow-x-auto">
          <table className="grid-t min-w-[860px]">
            <thead><tr>{[t.col_player, ...DIMS.map((d) => dimLabel[d]), t.col_mean, t.col_pain, t.col_comment].map((h) => <th key={h} className="label">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ p, w }) => (
                <tr key={p.id} onClick={() => openPlayer(p.id)}>
                  <td className="font-medium">{p.name}</td>
                  {DIMS.map((d) => <td key={d}><span className={`num font-mono inline-block min-w-[28px] text-center rounded px-1.5 py-0.5 ${cell(w[d])}`}>{w[d]}</span></td>)}
                  <td className="num font-mono font-bold">{fmt(wellnessScore(w))}</td>
                  <td>{w.pain ? <Chip level={w.pain.level >= 4 || w.pain.stopped ? 'bad' : 'warn'}>{zone(w.pain.zone, lang)} {w.pain.level}/10{w.pain.stopped ? ' ⛔' : ''}</Chip> : <span className="faint">—</span>}</td>
                  <td className="text-[13px] max-w-[260px]">{w.comment ?? <span className="faint">—</span>}</td>
                </tr>
              ))}
              {missing.map((p) => (
                <tr key={p.id} onClick={() => openPlayer(p.id)}>
                  <td className="muted">{p.name}</td>
                  <td colSpan={8} className="faint text-[13px]">{t.no_answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ───────────── Famílies ───────────── */

function FamilyView({ t, lang, club, team, player, setPlayerId, goMeasure }: { t: Dict; lang: Lang; club: { name: string }; team: Team; player: Player; setPlayerId: (id: string) => void; goMeasure: () => void }) {
  const v = derive(player, lang)
  if (!v) return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.family_title}</h1><PlayerSelect t={t} team={team} player={player} setPlayerId={setPlayerId} /></div>
      <div className="card p-6 grid gap-4 justify-items-start max-w-[560px]"><p>{t.no_measures}</p><button className="btn" onClick={goMeasure}>{t.measure_now} →</button></div>
    </div>
  )
  const name = firstName(player.name)
  const left = Math.max(0, v.target - v.height)
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.family_title}</h1>
          <p className="muted">{t.family_sub}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 no-print">
          <PlayerSelect t={t} team={team} player={player} setPlayerId={setPlayerId} />
          <button className="btn-ghost" onClick={() => window.print()}>{t.print}</button>
        </div>
      </div>
      <article className="card print-area mx-auto w-full max-w-[760px] p-6 md:p-10 grid gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 line-b pb-5">
          <div className="grid gap-1">
            <div className="label">{club.name ? `${club.name} · ` : ''}{team.name}</div>
            <h2 className="font-display text-[30px] font-bold leading-tight">{t.family_hello} {name}</h2>
          </div>
          <div className="flex items-center gap-2"><Logo /><span className="font-display font-bold">Estirada</span></div>
        </header>
        <div className="grid gap-3">
          <Chip level={v.phase.level}>{v.phase.label[lang]}</Chip>
          <p className="text-[17px] leading-relaxed">{t.family_phase_txt} <b>{v.phase.label[lang].toLowerCase()}</b>: {name} {t.phase_explain[v.phase.key]}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[[t.height, `${fmt(v.height)} cm`], [t.target, `${fmt(v.target, 0)} cm`], [t.left, `~${fmt(left, 0)} cm`]].map(([l, val]) => (
            <div key={l} className="grid gap-1 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}><div className="text-[12px] muted leading-snug">{l}</div><div className="font-mono text-[18px] font-medium num">{val}</div></div>
          ))}
        </div>
        {player.measures.length >= 2 && <GrowthChart measures={player.measures} target={v.target} unit="cm" />}
        <div className="grid gap-2">
          <h3 className="font-display text-[19px] font-bold">{t.family_home}</h3>
          <ul className="grid gap-2 text-[15px]">
            {[t.home1, t.home2, t.home3, t.home4].map((x) => <li key={x} className="pl-4 relative"><span className="absolute left-0 top-[10px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />{x}</li>)}
          </ul>
        </div>
        <p className="text-[12.5px] faint line-t pt-4">{t.family_note}</p>
      </article>
    </div>
  )
}

/* ───────────── Club ───────────── */

function ClubView({ t, lang, club, teams, openTeam }: { t: Dict; lang: Lang; club: { name: string; town: string }; teams: Team[]; openTeam: (id: string) => void }) {
  const all = teams.map((tm) => ({ tm, vs: deriveTeam(tm, lang) }))
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <div className="label">{[club.name, club.town].filter(Boolean).join(' · ')}</div>
        <h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.club_title}</h1>
        <p className="muted">{t.club_sub}</p>
      </div>
      <div className="flex flex-wrap gap-4 text-[13px] muted">
        {([['ok', t.stable], ['warn', t.attention], ['bad', t.growing]] as const).map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: `var(--${k})` }} />{l}</span>)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {all.map(({ tm, vs }) => {
          const by = { ok: vs.filter((v) => v.phase.level === 'ok').length, warn: vs.filter((v) => v.phase.level === 'warn').length, bad: vs.filter((v) => v.phase.level === 'bad').length }
          const red = vs.filter((v) => v.level === 'bad')
          return (
            <button key={tm.id} onClick={() => openTeam(tm.id)} className="card p-5 grid gap-4 text-left hover:border-[var(--accent)] content-start">
              <div className="grid gap-0.5"><h2 className="font-display text-[20px] font-bold">{tm.name}</h2><span className="text-[13px] muted">{tm.coach ? `${tm.coach} · ` : ''}{tm.players.length} {t.players.toLowerCase()}</span></div>
              <div className="flex h-3 gap-[2px] rounded-full overflow-hidden" role="img" aria-label={`${by.ok} ${t.stable}, ${by.warn} ${t.attention}, ${by.bad} ${t.growing}`}>
                {(['ok', 'warn', 'bad'] as const).map((k) => by[k] > 0 && <div key={k} style={{ flex: by[k], background: `var(--${k})` }} />)}
              </div>
              <div className="grid grid-cols-3 text-center">
                {(['ok', 'warn', 'bad'] as const).map((k) => <div key={k}><div className={`font-display text-[24px] font-bold num tx-${k}`}>{by[k]}</div><div className="text-[11.5px] muted">{k === 'ok' ? t.stable : k === 'warn' ? t.attention : t.growing}</div></div>)}
              </div>
              <div className="grid gap-1 line-t pt-3 text-[13px]">
                <div className="label">{t.red_alerts}: {red.length}</div>
                {red.slice(0, 3).map((v) => <div key={v.p.id} className="flex justify-between gap-2"><span>{v.p.name}</span><span className="tx-bad truncate">{v.alerts.find((a) => a.level === 'bad')?.text.split(':')[0]}</span></div>)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
