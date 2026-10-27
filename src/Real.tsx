import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Workspace, { Brand, LangToggle, Logo, todayISO, useLang } from '@/App'
import { CLUB, TEAMS, TODAY, type Player, type Team } from '@/lib/data'
import * as db from '@/lib/db'
import { fmt } from '@/lib/derive'
import { DICT, zone, type Dict } from '@/lib/i18n'
import { ageAt, type Lang, type Sex } from '@/lib/phv'
import { configured, supabase } from '@/lib/supabase'
import { InstallButton } from '@/components/Install'
import { normName, readTables, sheetsToPlayers, type ImportRow } from '@/lib/importer'

/* ───────────── Arrel: enrutament senzill ───────────── */

export default function Root() {
  const [lang, setLang] = useLang()
  const path = location.pathname
  if (path.startsWith('/e/')) { const [token, mode] = path.slice(3).split('/'); return <PublicSurvey token={token} effort={mode === 'esforc'} lang={lang} setLang={setLang} /> }
  return <CoachApp lang={lang} setLang={setLang} />
}

function DemoApp({ lang, setLang, onExit }: { lang: Lang; setLang: (l: Lang) => void; onExit?: () => void }) {
  const t = DICT[lang]
  const banner = (
    <div className="text-[13px] px-4 py-2 flex flex-wrap justify-center items-center gap-x-3" style={{ background: 'var(--accent-soft)' }}>
      <span>{t.demo_banner}</span>
      {onExit && <button className="underline font-medium" onClick={onExit}>{t.back_login} →</button>}
    </div>
  )
  return <Workspace demo teams={TEAMS} club={CLUB} today={TODAY} lang={lang} setLang={setLang} banner={banner} />
}

function CoachApp({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [demo, setDemo] = useState(!configured)
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { setSession(s); if (ev === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  if (demo) return <DemoApp lang={lang} setLang={setLang} onExit={configured ? () => setDemo(false) : undefined} />
  if (session === undefined) return <Loading lang={lang} />
  if (recovery && session) return <NewPassword lang={lang} done={() => setRecovery(false)} />
  if (!session) return <AuthScreen lang={lang} setLang={setLang} onDemo={() => setDemo(true)} />
  return <Signed lang={lang} setLang={setLang} email={session.user.email ?? ''} />
}

function Loading({ lang }: { lang: Lang }) {
  return <div className="min-h-screen grid place-items-center muted">{DICT[lang].loading}</div>
}

function Shell({ lang, setLang, children }: { lang: Lang; setLang: (l: Lang) => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid content-start">
      <header className="mx-auto w-full max-w-[460px] px-4 pt-8 pb-6 flex items-center justify-between"><Brand sub={DICT[lang].tagline} /><LangToggle lang={lang} setLang={setLang} /></header>
      <main className="mx-auto w-full max-w-[460px] px-4 pb-10">{children}</main>
    </div>
  )
}

/* ───────────── Accés ───────────── */

function AuthScreen({ lang, setLang, onDemo }: { lang: Lang; setLang: (l: Lang) => void; onDemo: () => void }) {
  const t = DICT[lang]
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    const r = mode === 'in'
      ? await supabase!.auth.signInWithPassword({ email, password: pass })
      : await supabase!.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin } })
    setBusy(false)
    if (r.error) setMsg({ ok: false, text: r.error.message })
    else if (mode === 'up' && !r.data.session) setMsg({ ok: true, text: t.check_email })
  }
  const forgot = async () => {
    if (!email) return setMsg({ ok: false, text: t.email })
    const r = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    setMsg(r.error ? { ok: false, text: r.error.message } : { ok: true, text: t.reset_sent })
  }
  return (
    <Shell lang={lang} setLang={setLang}>
      <form className="card p-6 grid gap-4" onSubmit={submit}>
        <h1 className="font-display text-[26px] font-bold">{mode === 'in' ? t.login_title : t.signup_title}</h1>
        <label className="field"><span className="text-[13px] font-medium">{t.email}</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.password}</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={8} value={pass} onChange={(e) => setPass(e.target.value)} /></label>
        {msg && <p className={`text-[14px] ${msg.ok ? 'tx-ok' : 'tx-bad'}`} role="status">{msg.text}</p>}
        <button className="btn justify-center" disabled={busy}>{mode === 'in' ? t.login : t.signup}</button>
        <div className="flex flex-wrap justify-between gap-2 text-[13.5px]">
          <button type="button" className="underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>{mode === 'in' ? t.no_account : t.have_account}</button>
          {mode === 'in' && <button type="button" className="underline muted" onClick={forgot}>{t.forgot}</button>}
        </div>
      </form>
      <button className="btn-ghost w-full justify-center mt-4" onClick={onDemo}>{t.see_demo}</button>
      <div className="flex justify-center mt-3"><InstallButton lang={lang} compact /></div>
      <p className="text-[12px] faint mt-6">{t.disclaimer_real}</p>
    </Shell>
  )
}

function NewPassword({ lang, done }: { lang: Lang; done: () => void }) {
  const t = DICT[lang]
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  return (
    <Shell lang={lang} setLang={() => {}}>
      <form className="card p-6 grid gap-4" onSubmit={async (e) => { e.preventDefault(); const r = await supabase!.auth.updateUser({ password: pass }); if (r.error) setErr(r.error.message); else done() }}>
        <label className="field"><span className="text-[13px] font-medium">{t.new_password}</span><input type="password" required minLength={8} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
        {err && <p className="tx-bad text-[14px]">{err}</p>}
        <button className="btn justify-center">{t.set_password}</button>
      </form>
    </Shell>
  )
}

/* ───────────── Sessió iniciada ───────────── */

function Signed({ lang, setLang, email }: { lang: Lang; setLang: (l: Lang) => void; email: string }) {
  const t = DICT[lang]
  const [profile, setProfile] = useState<db.Profile | null | undefined>(undefined)
  const [teams, setTeams] = useState<db.DbTeam[] | null>(null)
  const [err, setErr] = useState('')
  const [view, setView] = useState<'app' | 'privacy'>('app')
  const [editProfile, setEditProfile] = useState(false)

  const reload = useCallback(async () => {
    try { setTeams(await db.loadTeams()) } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { db.loadProfile().then(setProfile).catch((e) => setErr(e.message)); reload() }, [reload])

  const wrap = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => async (...a: A) => { await fn(...a); await reload() }
  const logout = () => supabase!.auth.signOut()

  if (err) return <Shell lang={lang} setLang={setLang}><div className="card p-6 grid gap-3"><p className="tx-bad">{t.error}</p><p className="font-mono text-[12px] muted">{err}</p><button className="btn-ghost" onClick={logout}>{t.logout}</button></div></Shell>
  if (profile === undefined || teams === null) return <Loading lang={lang} />
  if (!profile) return <Onboarding lang={lang} setLang={setLang} done={async (p, team) => { await db.saveProfile(p); await db.createTeam({ name: team, coach: p.coach_name }); setProfile(p); await reload() }} />

  const account = (
    <details className="relative">
      <summary className="list-none cursor-pointer w-8 h-8 rounded-full grid place-items-center text-[13px] font-semibold" style={{ background: 'var(--surface-2)' }} aria-label={t.settings}>{(profile.coach_name || email)[0]?.toUpperCase()}</summary>
      <div className="card absolute right-0 mt-2 p-4 grid gap-2 w-[240px] z-20 text-[13.5px]">
        <div className="font-medium">{profile.coach_name}</div>
        <div className="muted break-all">{email}</div>
        <button className="btn-ghost justify-center mt-1" onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; setEditProfile(true) }}>{t.edit_profile}</button>
        <button className="btn-ghost justify-center" onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; setView('privacy') }}>{t.privacy}</button>
        <button className="btn-ghost justify-center" onClick={logout}>{t.logout}</button>
      </div>
    </details>
  )

  if (view === 'privacy') return <Consent lang={lang} setLang={setLang} club={profile.club_name} back={() => setView('app')} />

  return (
    <>
    {editProfile && <ProfileSheet t={t} value={profile} onClose={() => setEditProfile(false)} onSave={async (p) => { await db.saveProfile(p); setProfile(p); setEditProfile(false) }} />}
    <Workspace demo={false} teams={teams} club={{ name: profile.club_name, town: profile.town }} today={todayISO()} lang={lang} setLang={setLang} account={account}
      actions={{ saveMeasure: wrap(db.saveMeasure), addInjury: wrap(db.addInjury), setInjuryStatus: wrap(db.setInjuryStatus), newSurveyLink: wrap(db.newSurveyLink), deleteMeasure: wrap(db.deleteMeasure), saveLoads: wrap(db.saveLoads) }}
      manage={({ t, lang, teams, toast }) => <Manage t={t} lang={lang} teams={teams} profile={profile} toast={toast} reload={reload} />} />
    </>
  )
}

function ProfileSheet({ t, value, onSave, onClose }: { t: Dict; value: db.Profile; onSave: (p: db.Profile) => Promise<void>; onClose: () => void }) {
  const [p, setP] = useState(value)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div className="sheet-bg" role="dialog" aria-modal="true" aria-labelledby="prof-h" onClick={onClose}>
      <form className="sheet grid gap-4" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave({ club_name: p.club_name.trim(), town: p.town.trim(), coach_name: p.coach_name.trim(), weekly_email: p.weekly_email !== false }) } catch (x) { setErr((x as Error).message); setBusy(false) } }}>
        <h2 id="prof-h" className="font-display text-[20px] font-bold">{t.edit_profile}</h2>
        <label className="field"><span className="text-[13px] font-medium">{t.coach_name}</span><input required value={p.coach_name} onChange={(e) => setP({ ...p, coach_name: e.target.value })} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.club_name}</span><input required value={p.club_name} onChange={(e) => setP({ ...p, club_name: e.target.value })} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.town} <span className="faint">({t.optional})</span></span><input value={p.town} onChange={(e) => setP({ ...p, town: e.target.value })} /></label>
        <label className="flex gap-2.5 items-start text-[14px]"><input type="checkbox" className="mt-1 w-4 h-4" checked={p.weekly_email !== false} onChange={(e) => setP({ ...p, weekly_email: e.target.checked })} /><span>{t.weekly_email}</span></label>
        {err && <p className="tx-bad text-[14px]">{err}</p>}
        <div className="flex gap-2"><button className="btn" disabled={busy}>{t.save_btn}</button><button className="btn-ghost" type="button" onClick={onClose}>{t.cancel}</button></div>
      </form>
    </div>
  )
}

/** Model de consentiment imprimible per a les famílies. */
function Consent({ lang, setLang, club, back }: { lang: Lang; setLang: (l: Lang) => void; club: string; back: () => void }) {
  const t = DICT[lang]
  return (
    <div className="min-h-full">
      <header className="no-print mx-auto w-full max-w-[760px] px-4 pt-6 pb-4 flex flex-wrap items-center gap-3">
        <button className="btn-ghost" onClick={back}>← {t.back}</button>
        <button className="btn" onClick={() => window.print()}>{t.consent_print}</button>
        <span className="ml-auto"><LangToggle lang={lang} setLang={setLang} /></span>
      </header>
      <p className="no-print mx-auto max-w-[760px] px-4 pb-4 muted text-[14px]">{t.consent_intro}</p>
      <article className="card print-area mx-auto w-full max-w-[760px] p-6 md:p-10 grid gap-4 mb-10 text-[15px] leading-relaxed">
        <div className="flex items-center gap-2"><Logo /><span className="font-display font-bold">{club}</span></div>
        <h1 className="font-display text-[26px] font-bold">{t.consent_title}</h1>
        {t.consent_body.map((para, i) => <p key={i}>{para.replace('{club}', club)}</p>)}
        <p className="flex gap-3 items-start mt-2"><span className="inline-block w-4 h-4 border border-current mt-1 shrink-0" />{t.consent_accept}</p>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 mt-4">
          {t.consent_sign.map((f) => <div key={f} className="grid gap-1"><div className="h-8 border-b border-current" /><span className="text-[12px] muted">{f}</span></div>)}
        </div>
      </article>
    </div>
  )
}

function Onboarding({ lang, setLang, done }: { lang: Lang; setLang: (l: Lang) => void; done: (p: db.Profile, team: string) => Promise<void> }) {
  const t = DICT[lang]
  const [p, setP] = useState<db.Profile>({ club_name: '', town: '', coach_name: '' })
  const [team, setTeam] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Shell lang={lang} setLang={setLang}>
      <form className="card p-6 grid gap-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await done(p, team.trim()) } catch (x) { setErr((x as Error).message); setBusy(false) } }}>
        <div className="grid gap-1"><h1 className="font-display text-[26px] font-bold">{t.onb_title}</h1><p className="muted">{t.onb_sub}</p></div>
        <label className="field"><span className="text-[13px] font-medium">{t.coach_name}</span><input required value={p.coach_name} onChange={(e) => setP({ ...p, coach_name: e.target.value })} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.club_name}</span><input required value={p.club_name} onChange={(e) => setP({ ...p, club_name: e.target.value })} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.town} <span className="faint">({t.optional})</span></span><input value={p.town} onChange={(e) => setP({ ...p, town: e.target.value })} /></label>
        <label className="field"><span className="text-[13px] font-medium">{t.team_name}</span><input required placeholder="Cadet Femení A" value={team} onChange={(e) => setTeam(e.target.value)} /></label>
        {err && <p className="tx-bad text-[14px]">{err}</p>}
        <button className="btn justify-center" disabled={busy}>{t.start} →</button>
      </form>
    </Shell>
  )
}

/* ───────────── Gestionar equips i jugadors ───────────── */

const emptyPlayer: db.PlayerInput = { name: '', sex: 'F', dob: '', father: null, mother: null }

function Manage({ t, lang, teams, profile, toast, reload }: { t: Dict; lang: Lang; teams: Team[]; profile: db.Profile; toast: (s: string) => void; reload: () => Promise<void> }) {
  const [editTeam, setEditTeam] = useState<{ id?: string; name: string; coach: string } | null>(null)
  const [editPlayer, setEditPlayer] = useState<{ teamId: string; id?: string; v: db.PlayerInput } | null>(null)
  const [importTo, setImportTo] = useState<Team | null>(null)
  const act = async (fn: () => Promise<void>, ok = t.done) => {
    try { await fn(); await reload(); toast(ok) } catch (e) { console.error(e); toast(t.error) }
  }
  const today = todayISO()
  const fromPlayer = (p: Player): db.PlayerInput => ({ name: p.name, sex: p.sex, dob: p.dob, father: Number.isFinite(p.father) ? p.father : null, mother: Number.isFinite(p.mother) ? p.mother : null })
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1"><div className="label">{profile.club_name}</div><h1 className="font-display text-[34px] md:text-[40px] font-bold leading-none">{t.teams_title}</h1></div>
        <button className="btn" onClick={() => setEditTeam({ name: '', coach: profile.coach_name })}>+ {t.add_team}</button>
      </div>

      {editTeam && (
        <form className="card p-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end" onSubmit={(e) => { e.preventDefault(); const v = { name: editTeam.name.trim(), coach: editTeam.coach.trim() }; act(() => (editTeam.id ? db.updateTeam(editTeam.id, v) : db.createTeam(v))); setEditTeam(null) }}>
          <label className="field"><span className="text-[13px] font-medium">{t.team_name}</span><input required autoFocus value={editTeam.name} onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })} /></label>
          <label className="field"><span className="text-[13px] font-medium">{t.coach_label}</span><input value={editTeam.coach} onChange={(e) => setEditTeam({ ...editTeam, coach: e.target.value })} /></label>
          <div className="flex gap-2"><button className="btn" type="submit">{t.save_btn}</button><button className="btn-ghost" type="button" onClick={() => setEditTeam(null)}>{t.cancel}</button></div>
        </form>
      )}

      {teams.length === 0 && !editTeam && <p className="muted">{t.no_teams}</p>}
      {importTo && <ImportSheet t={t} team={importTo} today={today} onClose={() => setImportTo(null)} onImport={async (rows) => { setImportTo(null); await act(() => db.importPlayers(importTo.id, rows), t.import_done) }} />}

      {teams.map((tm) => (
        <section key={tm.id} className="card p-5 grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="grid gap-0.5"><h2 className="font-display text-[22px] font-bold">{tm.name}</h2><span className="text-[13px] muted">{tm.coach ? `${t.coach_label}: ${tm.coach} · ` : ''}{tm.players.length} {t.players.toLowerCase()}</span></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => setEditPlayer({ teamId: tm.id, v: { ...emptyPlayer } })}>+ {t.add_player}</button>
              <button className="btn-ghost" onClick={() => setEditTeam({ id: tm.id, name: tm.name, coach: tm.coach })}>{t.edit}</button>
              <button className="btn-ghost" onClick={() => setImportTo(tm)}>{t.import_excel}</button>
              {tm.players.length > 0 && <button className="btn-ghost" onClick={() => downloadCsv(tm, t)}>{t.export_csv}</button>}
              <button className="btn-ghost tx-bad" onClick={() => confirm(t.confirm_delete_team) && act(() => db.deleteTeam(tm.id))}>{t.delete}</button>
            </div>
          </div>

          {editPlayer?.teamId === tm.id && (
            <PlayerForm t={t} today={today} value={editPlayer.v} onCancel={() => setEditPlayer(null)}
              isNew={!editPlayer.id} onSave={(v) => { const ep = editPlayer; setEditPlayer(null); act(() => (ep.id ? db.updatePlayer(ep.id, v) : db.createPlayer(tm.id, v))) }} />
          )}

          {tm.players.length === 0 ? <p className="muted text-[14px]">{t.no_players}</p> : (
            <div className="overflow-x-auto">
              <table className="grid-t min-w-[620px]">
                <thead><tr>{[t.col_player, t.col_age, t.sex, t.father_h, t.mother_h, ''].map((h, i) => <th key={i} className="label">{h}</th>)}</tr></thead>
                <tbody>
                  {tm.players.map((p) => (
                    <tr key={p.id} style={{ cursor: 'default' }}>
                      <td className="font-medium">{p.name}{p.injuries.some((i) => i.status === 'oberta') && <span className="tx-warn text-[12px] ml-2">● {zone(p.injuries.find((i) => i.status === 'oberta')!.zone, lang).toLowerCase()}</span>}</td>
                      <td className="num font-mono text-[13px]">{fmt(ageAt(p.dob, today))}</td>
                      <td className="text-[13px]">{p.sex === 'F' ? t.female : t.male}</td>
                      <td className="num font-mono text-[13px]">{fmt(p.father, 0)}</td>
                      <td className="num font-mono text-[13px]">{fmt(p.mother, 0)}</td>
                      <td className="text-right whitespace-nowrap">
                        <button className="text-[13px] underline mr-3" onClick={() => setEditPlayer({ teamId: tm.id, id: p.id, v: fromPlayer(p) })}>{t.edit}</button>
                        <button className="text-[13px] underline tx-bad" onClick={() => confirm(t.confirm_delete_player) && act(() => db.deletePlayer(p.id))}>{t.delete}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

/** Exporta l'equip (jugadors + mesures) en CSV amb ; per obrir-lo directament amb Excel. */
/** Plantilla buida per omplir amb Excel. */
function downloadTemplate(t: Dict) {
  const head = [t.player_name, t.sex, t.dob, t.father_h, t.mother_h, t.measure_date, t.m_height, t.m_sitting, t.m_mass]
  const ex = ['Laia Ferrer', 'F', '14/02/2013', '180', '165', '01/10/2026', '158,2', '80,1', '45']
  saveText('﻿' + [head, ex].map((r) => r.join(';')).join('\r\n'), 'estirada-plantilla.csv')
}
function saveText(text: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

type ImportItem = ImportRow & { id?: string }
function ImportSheet({ t, team, today, onClose, onImport }: { t: Dict; team: Team; today: string; onClose: () => void; onImport: (rows: { id?: string; p: db.PlayerInput; measures: ImportRow['measures']; wellness: ImportRow['wellness'] }[]) => Promise<void> }) {
  const [items, setItems] = useState<ImportItem[] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [sex, setSex] = useState<Sex>(team.players[0]?.sex ?? 'F')
  const [ok, setOk] = useState(false)
  const minDob = `${+today.slice(0, 4) - 22}-01-01`
  const pick = async (f: File | undefined) => {
    if (!f) return
    setMsg(t.import_reading); setItems(null)
    try {
      const rows = sheetsToPlayers(await readTables(f), today)
      if (!rows) return setMsg(t.import_no_header)
      if (!rows.length) return setMsg(t.import_empty)
      const byName = new Map(team.players.map((p) => [normName(p.name), p]))
      setItems(rows.map((r) => {
        const ex = byName.get(normName(r.name))
        return ex ? { ...r, id: ex.id, name: ex.name, sex: r.sex ?? ex.sex, dob: r.dob ?? ex.dob, father: r.father ?? (Number.isFinite(ex.father) ? ex.father : null), mother: r.mother ?? (Number.isFinite(ex.mother) ? ex.mother : null) } : r
      }))
      setMsg('')
    } catch (e) { setMsg((e as Error).message === 'xls' ? t.import_xls : t.error) }
  }
  const ready = (items ?? []).filter((r) => r.dob)
  const set = (i: number, patch: Partial<ImportItem>) => setItems(items!.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="sheet-bg" role="dialog" aria-modal="true" aria-labelledby="imp-h" onClick={onClose}>
      <div className="sheet grid gap-4" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        <div className="grid gap-1"><div className="label">{team.name}</div><h2 id="imp-h" className="font-display text-[20px] font-bold">{t.import_title}</h2></div>
        <p className="text-[14px] muted">{t.import_help}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="btn cursor-pointer">{t.import_choose}<input type="file" accept=".xlsx,.csv,.txt,.xls" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <button type="button" className="btn-ghost" onClick={() => downloadTemplate(t)}>{t.import_template}</button>
        </div>
        {msg && <p className="text-[14px]" role="status">{msg}</p>}
        {items && (
          <>
            <div className="overflow-x-auto max-h-[46vh]">
              <table className="grid-t">
                <thead><tr>{[t.col_player, t.dob, t.sex, t.import_measures_n, t.import_answers_n].map((h, i) => <th key={i} className="label">{h}</th>)}</tr></thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      <td className="font-medium">{r.name}<div className="text-[12px] font-normal">{r.id ? <span className="muted">{t.import_update}</span> : <span className="tx-ok">{t.import_new}</span>}</div>{r.problems.includes('measure') && <div className="tx-warn text-[12px] font-normal">{t.import_bad_measure}</div>}</td>
                      <td>{r.dob && !r.problems.includes('dob') ? <span className="font-mono text-[13px]">{new Date(r.dob + 'T12:00:00').toLocaleDateString('es-ES')}</span>
                        : <input type="date" aria-label={`${t.dob} ${r.name}`} className="text-[13px] border rounded px-1 py-0.5 w-[8.5rem]" style={{ borderColor: 'var(--bad)' }} min={minDob} max={today} value={r.dob ?? ''} onChange={(e) => set(i, { dob: e.target.value || null })} />}</td>
                      <td className="text-[13px]">{(r.sex ?? sex)}{!r.sex && <span className="faint">*</span>}</td>
                      <td className="num font-mono text-[13px]">{r.measures.length}</td>
                      <td className="num font-mono text-[13px]">{r.wellness.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.some((r) => !r.sex) && (
              <fieldset className="flex flex-wrap items-center gap-2 text-[14px]"><legend className="sr-only">{t.import_default_sex}</legend><span>* {t.import_default_sex}:</span>
                {(['F', 'M'] as Sex[]).map((s) => <button type="button" key={s} className="pill" aria-pressed={sex === s} onClick={() => setSex(s)}>{s === 'F' ? t.female : t.male}</button>)}
              </fieldset>
            )}
            {items.some((r) => !r.dob) && <p className="text-[13px] tx-warn">{t.import_need_dob}. {t.import_skip}</p>}
            {items.some((r) => !r.id) && <label className="flex gap-2.5 items-start text-[14px]"><input type="checkbox" className="mt-1 w-4 h-4" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t.consent_check}</span></label>}
          </>
        )}
        <div className="flex gap-2">
          {items && <button className="btn" disabled={busy || ready.length === 0 || (items.some((r) => !r.id) && !ok)}
            onClick={async () => { setBusy(true); await onImport(ready.map((r) => ({ id: r.id, measures: r.measures, wellness: r.wellness, p: { name: r.name, sex: r.sex ?? sex, dob: r.dob!, father: r.father, mother: r.mother } }))) }}>
            {t.import_btn.replace('{n}', String(ready.length))}</button>}
          <button className="btn-ghost" type="button" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  )
}

function downloadCsv(tm: Team, t: Dict) {
  const head = [t.col_player, t.sex, t.dob, t.father_h, t.mother_h, t.measure_date, t.m_height, t.m_sitting, t.m_mass]
  const num = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '' : String(n).replace('.', ','))
  const q = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)
  const rows: string[][] = []
  for (const p of tm.players) {
    const base = [p.name, p.sex, p.dob, num(p.father), num(p.mother)]
    if (p.measures.length === 0) rows.push([...base, '', '', '', ''])
    for (const m of p.measures) rows.push([...base, m.date, num(m.height), num(m.sitting), num(m.mass)])
  }
  const csv = '\ufeff' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `${tm.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function PlayerForm({ t, today, value, isNew, onSave, onCancel }: { t: Dict; today: string; value: db.PlayerInput; isNew: boolean; onSave: (v: db.PlayerInput) => void; onCancel: () => void }) {
  const [v, setV] = useState(value)
  const [ok, setOk] = useState(!isNew)
  const [f, setF] = useState(value.father?.toString() ?? '')
  const [m, setM] = useState(value.mother?.toString() ?? '')
  const parse = (x: string) => { const n = parseFloat(x.replace(',', '.')); return Number.isFinite(n) && n > 130 && n < 230 ? n : null }
  const minDob = `${+today.slice(0, 4) - 22}-01-01`
  return (
    <form className="grid gap-3 sm:grid-cols-3 p-4 rounded-xl" style={{ background: 'var(--surface-2)' }}
      onSubmit={(e) => { e.preventDefault(); onSave({ ...v, name: v.name.trim(), father: parse(f), mother: parse(m) }) }}>
      <label className="field sm:col-span-2"><span className="text-[13px] font-medium">{t.player_name}</span><input required autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
      <fieldset className="grid gap-1.5"><legend className="text-[13px] font-medium mb-1.5">{t.sex}</legend>
        <div className="flex gap-2">{(['F', 'M'] as Sex[]).map((s) => <button type="button" key={s} className="pill flex-1" aria-pressed={v.sex === s} onClick={() => setV({ ...v, sex: s })}>{s === 'F' ? t.female : t.male}</button>)}</div>
      </fieldset>
      <label className="field"><span className="text-[13px] font-medium">{t.dob}</span><input type="date" required min={minDob} max={today} value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} /></label>
      <label className="field"><span className="text-[13px] font-medium">{t.father_h} <span className="faint">({t.optional})</span></span><input inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} /></label>
      <label className="field"><span className="text-[13px] font-medium">{t.mother_h} <span className="faint">({t.optional})</span></span><input inputMode="decimal" value={m} onChange={(e) => setM(e.target.value)} /></label>
      {isNew && <label className="sm:col-span-3 flex gap-2.5 items-start text-[14px]"><input type="checkbox" className="mt-1 w-4 h-4" required checked={ok} onChange={(e) => setOk(e.target.checked)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.consent_need)} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} /><span>{t.consent_check}</span></label>}
      <div className="sm:col-span-3 flex gap-2"><button className="btn" type="submit">{t.save_btn}</button><button className="btn-ghost" type="button" onClick={onCancel}>{t.cancel}</button></div>
    </form>
  )
}

/* ───────────── Qüestionari públic (jugadores, sense compte) ───────────── */

const FACES = ['😫', '🙁', '😐', '🙂', '😄']

function PublicSurvey({ token, effort, lang, setLang }: { token: string; effort: boolean; lang: Lang; setLang: (l: Lang) => void }) {
  const t = DICT[lang]
  const [info, setInfo] = useState<db.SurveyTeam | null | undefined>(undefined)
  const [mode, setMode] = useState<'week' | 'effort'>(effort ? 'effort' : 'week')
  const [who, setWho] = useState('')
  const [pain, setPain] = useState<boolean | null>(null)
  const [zoneV, setZone] = useState('Genoll')
  const [level, setLevel] = useState(3)
  const [side, setSide] = useState('Dret')
  const [stopped, setStopped] = useState(false)
  const [scores, setScores] = useState<Record<'energy' | 'sleep' | 'legs' | 'stress' | 'mood', number>>({ energy: 0, sleep: 0, legs: 0, stress: 0, mood: 0 })
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'error'>('form')

  useEffect(() => { if (configured) db.surveyTeam(token).then(setInfo).catch(() => setInfo(null)); else setInfo(null) }, [token])
  const dims: [keyof typeof scores, string][] = [['energy', t.energy], ['sleep', t.sleep], ['legs', t.legs], ['stress', t.stress], ['mood', t.mood]]
  const ready = who && pain !== null && Object.values(scores).every((x) => x > 0)
  const reset = () => { setWho(''); setPain(null); setLevel(3); setStopped(false); setScores({ energy: 0, sleep: 0, legs: 0, stress: 0, mood: 0 }); setComment(''); setState('form'); window.scrollTo({ top: 0 }) }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ready) return; setState('sending')
    try { await db.submitSurvey(token, who, { ...scores, pain: pain ? { zone: zoneV, level, side, stopped } : null, comment: comment.trim() || undefined }); setState('sent') } catch { setState('error') }
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 py-3 flex items-center gap-2 line-b" style={{ background: 'var(--surface)' }}>
        <Logo /><span className="font-display font-bold">Estirada</span><span className="ml-auto mr-2 text-[12px] muted truncate">{info?.team}</span><InstallButton lang={lang} compact /><LangToggle lang={lang} setLang={setLang} />
      </header>
      <main className="mx-auto max-w-[480px] px-4 py-6">
        {info && <div className="flex gap-2 mb-5" role="group">{(['week', 'effort'] as const).map((m) => <button key={m} type="button" className="pill flex-1" aria-pressed={mode === m} onClick={() => { setMode(m); history.replaceState(null, '', `/e/${token}${m === 'effort' ? '/esforc' : ''}`) }}>{m === 'week' ? t.mode_week : t.mode_effort}</button>)}</div>}
        {info === undefined ? <p className="muted">{t.loading}</p>
          : info === null ? <p className="card p-6">{t.invalid_link}</p>
          : mode === 'effort' ? <EffortForm t={t} token={token} players={info.players} who={who} setWho={setWho} />
          : state === 'sent' ? (
            <div className="card p-6 grid gap-4 text-center">
              <div className="text-[44px]">✅</div>
              <p className="font-display text-[20px] font-bold">{t.thanks}</p>
              <button className="btn-ghost justify-self-center" onClick={reset}>{t.answer_again}</button>
            </div>
          ) : (
            <form className="grid gap-5" onSubmit={submit}>
              <div className="grid gap-1"><h1 className="font-display text-[26px] font-bold">{t.survey_title}</h1><p className="muted text-[14px]">{t.survey_week}</p></div>
              <label className="field"><span className="text-[14px] font-medium">{t.who}</span>
                <select required value={who} onChange={(e) => setWho(e.target.value)}><option value="">—</option>{info.players.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </label>
              <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.pain_q}</legend>
                <div className="flex gap-2">{[true, false].map((b) => <button type="button" key={String(b)} className="pill flex-1" aria-pressed={pain === b} onClick={() => setPain(b)}>{b ? t.yes : t.no}</button>)}</div>
              </fieldset>
              {pain && (
                <>
                  <label className="field"><span className="text-[14px] font-medium">{t.where}</span>
                    <select value={zoneV} onChange={(e) => setZone(e.target.value)}>{['Genoll', 'Taló', 'Turmell', 'Esquena', 'Maluc', 'Espatlla', 'Canell'].map((z) => <option key={z} value={z}>{zone(z, lang)}</option>)}</select>
                  </label>
                  <label className="field"><span className="text-[14px] font-medium flex justify-between">{t.how_much}<span className="font-mono">{level}</span></span>
                    <input type="range" min={0} max={10} value={level} onChange={(e) => setLevel(+e.target.value)} style={{ padding: 0, border: 0, accentColor: 'var(--accent)' }} />
                  </label>
                  <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.side}</legend>
                    <div className="flex gap-2">{[['Esquerre', t.left_s], ['Dret', t.right_s], ['Tots dos', t.both]].map(([k, l]) => <button type="button" key={k} className="pill flex-1 text-[13px]" aria-pressed={side === k} onClick={() => setSide(k)}>{l}</button>)}</div>
                  </fieldset>
                  <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.stopped_q}</legend>
                    <div className="flex gap-2">{[true, false].map((b) => <button type="button" key={String(b)} className="pill flex-1" aria-pressed={stopped === b} onClick={() => setStopped(b)}>{b ? t.yes : t.no}</button>)}</div>
                  </fieldset>
                </>
              )}
              {dims.map(([k, l]) => (
                <fieldset key={k} className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{l}</legend>
                  <div className="flex gap-1.5">{FACES.map((f, i) => <button type="button" key={i} className="scale-btn" aria-label={`${l} ${i + 1}`} aria-pressed={scores[k] === i + 1} onClick={() => setScores({ ...scores, [k]: i + 1 })}>{f}</button>)}</div>
                </fieldset>
              ))}
              <label className="field"><span className="text-[14px] font-medium">{t.comment_q} <span className="faint">({t.optional})</span></span>
                <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              {state === 'error' && <p className="tx-bad text-[14px]">{t.error}</p>}
              <button className="btn justify-center" type="submit" disabled={!ready || state === 'sending'} style={!ready ? { opacity: 0.5 } : undefined}>{t.send}</button>
            </form>
          )}
        <p className="text-[12px] faint mt-8">{t.disclaimer_real}</p>
      </main>
    </div>
  )
}

const localISO = (back = 0) => { const d = new Date(); d.setDate(d.getDate() - back); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

/** Esforç d'una sessió (sRPE), per a les jugadores després d'entrenar o jugar. */
function EffortForm({ t, token, players, who, setWho }: { t: Dict; token: string; players: db.SurveyTeam['players']; who: string; setWho: (id: string) => void }) {
  const [back, setBack] = useState(0)
  const [kind, setKind] = useState<'entreno' | 'partit'>('entreno')
  const [minutes, setMinutes] = useState('')
  const [rpe, setRpe] = useState(0)
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'error'>('form')
  const mins = parseInt(minutes, 10)
  const ready = who && rpe > 0 && mins > 0 && mins <= 300
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ready) return; setState('sending')
    try { await db.submitLoad(token, who, { date: localISO(back), kind, minutes: mins, rpe }); setState('sent') } catch { setState('error') }
  }
  if (state === 'sent') return (
    <div className="card p-6 grid gap-4 text-center">
      <div className="text-[44px]">💪</div>
      <p className="font-display text-[20px] font-bold">{t.effort_thanks}</p>
      <button className="btn-ghost justify-self-center" onClick={() => { setWho(''); setRpe(0); setMinutes(''); setState('form') }}>{t.answer_again}</button>
    </div>
  )
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <h1 className="font-display text-[26px] font-bold">{t.effort_title}</h1>
      <label className="field"><span className="text-[14px] font-medium">{t.who}</span>
        <select required value={who} onChange={(e) => setWho(e.target.value)}><option value="">—</option>{players.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </label>
      <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.effort_when}</legend>
        <div className="flex gap-2">{[[0, t.today_s], [1, t.yesterday]].map(([b, l]) => <button type="button" key={b} className="pill flex-1" aria-pressed={back === b} onClick={() => setBack(b as number)}>{l}</button>)}</div>
        <div className="flex gap-2">{(['entreno', 'partit'] as const).map((k) => <button type="button" key={k} className="pill flex-1" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'partit' ? t.kind_partit : t.kind_entreno}</button>)}</div>
      </fieldset>
      <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.effort_minutes}</legend>
        <div className="flex flex-wrap gap-1.5">{['15', '30', '45', '60', '75', '90', '120'].map((m) => <button type="button" key={m} className="pill text-[13px]" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}</button>)}</div>
        <input inputMode="numeric" aria-label={t.effort_minutes} className="border rounded-lg px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }} value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
      </fieldset>
      <fieldset className="grid gap-2"><legend className="text-[14px] font-medium mb-2">{t.effort_q}</legend>
        <div className="grid grid-cols-5 gap-1.5">{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} className="scale-btn font-mono" aria-pressed={rpe === n} aria-label={`${n} · ${t.rpe_labels[n]}`} onClick={() => setRpe(n)}>{n}</button>
        ))}</div>
        <p className="text-[14px] text-center min-h-[1.4em] font-medium">{rpe ? t.rpe_labels[rpe] : ''}</p>
      </fieldset>
      {state === 'error' && <p className="tx-bad text-[14px]">{t.error}</p>}
      <button className="btn justify-center" type="submit" disabled={!ready || state === 'sending'} style={!ready ? { opacity: 0.5 } : undefined}>{t.send}</button>
    </form>
  )
}
