import type { Injury, Player, Team, Wellness } from './data'
import type { Measure, Sex } from './phv'
import { supabase } from './supabase'

export interface Profile { club_name: string; town: string; coach_name: string }
export interface DbTeam extends Team { survey_token: string }
export interface PlayerInput { name: string; sex: Sex; dob: string; father: number | null; mother: number | null }

const sb = () => {
  if (!supabase) throw new Error('Supabase no configurat')
  return supabase
}
const num = (v: unknown) => (v === null || v === undefined ? NaN : Number(v))
const check = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

/** Etiqueta curta d/m per a una data ISO. */
export const weekLabel = (iso: string) => { const [, m, d] = iso.split('-'); return `${+d}/${+m}` }

export async function loadProfile(): Promise<Profile | null> {
  const { data: u } = await sb().auth.getUser()
  if (!u.user) return null
  const r = await sb().from('profiles').select('club_name, town, coach_name').eq('id', u.user.id).maybeSingle()
  return check(r)
}

export async function saveProfile(p: Profile) {
  const { data: u } = await sb().auth.getUser()
  check(await sb().from('profiles').upsert({ id: u.user!.id, ...p }))
}

export async function loadTeams(): Promise<DbTeam[]> {
  const [teams, players, measures, wellness, injuries] = await Promise.all([
    sb().from('teams').select('*').order('created_at'),
    sb().from('players').select('*').order('name'),
    sb().from('measures').select('*').order('date'),
    sb().from('wellness').select('*').order('week'),
    sb().from('injuries').select('*').order('date', { ascending: false }),
  ]).then((rs) => rs.map(check) as Record<string, unknown>[][])

  const byPlayer = <T,>(rows: Record<string, unknown>[], map: (r: Record<string, unknown>) => T) => {
    const out = new Map<string, T[]>()
    for (const r of rows) { const k = r.player_id as string; out.set(k, [...(out.get(k) ?? []), map(r)]) }
    return out
  }
  const ms = byPlayer<Measure>(measures, (r) => ({ date: r.date as string, height: num(r.height), sitting: num(r.sitting), mass: num(r.mass) }))
  const ws = byPlayer<Wellness>(wellness, (r) => ({
    week: weekLabel(r.week as string), energy: num(r.energy), sleep: num(r.sleep), legs: num(r.legs), stress: num(r.stress), mood: num(r.mood),
    pain: r.pain_zone ? { zone: r.pain_zone as string, level: num(r.pain_level), side: (r.pain_side as string) ?? '', stopped: !!r.pain_stopped } : null,
    comment: (r.comment as string) || undefined,
  }))
  const is = byPlayer<Injury & { id: string }>(injuries, (r) => ({ id: r.id as string, date: r.date as string, zone: r.zone as string, note: r.note as string, status: r.status as Injury['status'] }))

  return teams.map((t) => ({
    id: t.id as string, name: t.name as string, sport: t.sport as string, coach: t.coach as string, survey_token: t.survey_token as string,
    players: players.filter((p) => p.team_id === t.id).map((p): Player => ({
      id: p.id as string, name: p.name as string, sex: p.sex as Sex, dob: p.dob as string,
      father: num(p.father), mother: num(p.mother),
      measures: ms.get(p.id as string) ?? [], wellness: (ws.get(p.id as string) ?? []).slice(-8), injuries: is.get(p.id as string) ?? [],
    })),
  }))
}

export async function createTeam(t: { name: string; coach: string }) {
  check(await sb().from('teams').insert({ name: t.name, coach: t.coach }))
}
export async function updateTeam(id: string, t: { name: string; coach: string }) {
  check(await sb().from('teams').update(t).eq('id', id))
}
export async function deleteTeam(id: string) {
  check(await sb().from('teams').delete().eq('id', id))
}
export async function newSurveyLink(id: string) {
  check(await sb().from('teams').update({ survey_token: crypto.randomUUID() }).eq('id', id))
}

export async function createPlayer(teamId: string, p: PlayerInput) {
  check(await sb().from('players').insert({ team_id: teamId, ...p }))
}
export async function updatePlayer(id: string, p: PlayerInput) {
  check(await sb().from('players').update(p).eq('id', id))
}
export async function deletePlayer(id: string) {
  check(await sb().from('players').delete().eq('id', id))
}

export async function saveMeasure(playerId: string, m: Measure) {
  check(await sb().from('measures').upsert({ player_id: playerId, ...m }, { onConflict: 'player_id,date' }))
}
export async function deleteMeasure(playerId: string, date: string) {
  check(await sb().from('measures').delete().eq('player_id', playerId).eq('date', date))
}

export async function addInjury(playerId: string, i: Injury) {
  check(await sb().from('injuries').insert({ player_id: playerId, ...i }))
}
export async function setInjuryStatus(id: string, status: Injury['status']) {
  check(await sb().from('injuries').update({ status }).eq('id', id))
}

export interface SurveyTeam { team: string; players: { id: string; name: string }[] }
export async function surveyTeam(token: string): Promise<SurveyTeam | null> {
  return check(await sb().rpc('survey_team', { token })) as SurveyTeam | null
}
export async function submitSurvey(token: string, player: string, w: Omit<Wellness, 'week'>) {
  const ok = check(await sb().rpc('submit_survey', {
    token, player, energy: w.energy, sleep: w.sleep, legs: w.legs, stress: w.stress, mood: w.mood,
    pain_zone: w.pain?.zone ?? null, pain_level: w.pain?.level ?? null, pain_side: w.pain?.side ?? null, pain_stopped: w.pain?.stopped ?? null,
    comment: w.comment ?? '',
  }))
  if (!ok) throw new Error('invalid')
}

/** Importació massiva: crea les jugadores noves (o actualitza les que ja hi són per nom) i desa totes les mesures. */
export async function importPlayers(teamId: string, rows: { id?: string; p: PlayerInput; measures: Measure[] }[]) {
  const fresh = rows.filter((r) => !r.id)
  const created = fresh.length
    ? check(await sb().from('players').insert(fresh.map((r) => ({ team_id: teamId, ...r.p }))).select('id')) as { id: string }[]
    : []
  fresh.forEach((r, i) => { r.id = created[i].id })
  for (const r of rows.filter((x) => !fresh.includes(x))) check(await sb().from('players').update(r.p).eq('id', r.id!))
  const ms = rows.flatMap((r) => r.measures.map((m) => ({ player_id: r.id!, ...m })))
  if (ms.length) check(await sb().from('measures').upsert(ms, { onConflict: 'player_id,date' }))
}
