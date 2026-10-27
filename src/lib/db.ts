import type { Injury, Load, Team, Wellness } from './data'
import { assembleTeams } from './rows'
import type { Measure, Sex } from './phv'
import { supabase } from './supabase'

export interface Profile { club_name: string; town: string; coach_name: string; weekly_email?: boolean }
export interface DbTeam extends Team { survey_token: string }
export interface PlayerInput { name: string; sex: Sex; dob: string; father: number | null; mother: number | null }

const sb = () => {
  if (!supabase) throw new Error('Supabase no configurat')
  return supabase
}
const check = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export { weekLabel } from './rows'

export async function loadProfile(): Promise<Profile | null> {
  const { data: u } = await sb().auth.getUser()
  if (!u.user) return null
  const r = check(await sb().from('profiles').select('*').eq('id', u.user.id).maybeSingle()) as Record<string, unknown> | null
  return r && { club_name: r.club_name as string, town: r.town as string, coach_name: r.coach_name as string, weekly_email: r.weekly_email as boolean | undefined }
}

export async function saveProfile(p: Profile) {
  const { data: u } = await sb().auth.getUser()
  check(await sb().from('profiles').upsert({ id: u.user!.id, ...p }))
}

export async function loadTeams(): Promise<DbTeam[]> {
  const since = new Date(Date.now() - 70 * 864e5).toISOString().slice(0, 10)
  const tolerant = <T extends { error: unknown }>(r: T) => (r.error ? { data: [], error: null } : r)
  const [teams, players, measures, wellness, injuries, loads, warmups] = await Promise.all([
    sb().from('teams').select('*').order('created_at'),
    sb().from('players').select('*').order('name'),
    sb().from('measures').select('*').order('date'),
    sb().from('wellness').select('*').order('week'),
    sb().from('injuries').select('*').order('date', { ascending: false }),
    // Si la taula de càrrega encara no existeix, l'app continua funcionant sense.
    sb().from('loads').select('*').gte('date', since).order('date').then(tolerant),
    sb().from('warmups').select('*').gte('date', since).order('date').then(tolerant),
  ]).then((rs) => rs.map(check) as Record<string, unknown>[][])

  return assembleTeams({ teams, players, measures, wellness, injuries, loads, warmups })
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

/** Desa o actualitza la càrrega d'una sessió (una fila per jugadora, data i tipus). */
export async function saveLoads(rows: { playerId: string; load: Load }[]) {
  check(await sb().from('loads').upsert(rows.map((r) => ({ player_id: r.playerId, date: r.load.date, kind: r.load.kind, minutes: r.load.minutes, rpe: r.load.rpe })), { onConflict: 'player_id,date,kind' }))
}

/** Marca o desmarca que l'equip ha fet l'escalfament de prevenció un dia. */
export async function setWarmup(teamId: string, date: string, done: boolean) {
  if (done) check(await sb().from('warmups').upsert({ team_id: teamId, date }, { onConflict: 'team_id,date' }))
  else check(await sb().from('warmups').delete().eq('team_id', teamId).eq('date', date))
}

export async function submitLoad(token: string, player: string, l: Omit<Load, 'id'>) {
  const ok = check(await sb().rpc('submit_load', { token, player, day: l.date, kind: l.kind, minutes: l.minutes, rpe: l.rpe }))
  if (!ok) throw new Error('invalid')
}

export interface SurveyTeam { team: string; players: { id: string; name: string }[] }
export async function surveyTeam(token: string): Promise<SurveyTeam | null> {
  return check(await sb().rpc('survey_team', { token })) as SurveyTeam | null
}
export async function submitSurvey(token: string, player: string, w: Omit<Wellness, 'week'>) {
  const args = {
    token, player, energy: w.energy, sleep: w.sleep, legs: w.legs, stress: w.stress, mood: w.mood,
    pain_zone: w.pain?.zone ?? null, pain_level: w.pain?.level ?? null, pain_side: w.pain?.side ?? null, pain_stopped: w.pain?.stopped ?? null,
    comment: w.comment ?? '',
  }
  let r = await sb().rpc('submit_survey', { ...args, sleep_hours: w.sleepHours ?? null })
  if (r.error) r = await sb().rpc('submit_survey', args) // base de dades encara sense hores de son
  const ok = check(r)
  if (!ok) throw new Error('invalid')
}

/** Importació massiva: crea les jugadores noves (o actualitza les que ja hi són per nom) i desa totes les mesures. */
export async function importPlayers(teamId: string, rows: { id?: string; p: PlayerInput; measures: Measure[]; wellness?: Wellness[] }[]) {
  const fresh = rows.filter((r) => !r.id)
  const created = fresh.length
    ? check(await sb().from('players').insert(fresh.map((r) => ({ team_id: teamId, ...r.p }))).select('id')) as { id: string }[]
    : []
  fresh.forEach((r, i) => { r.id = created[i].id })
  for (const r of rows.filter((x) => !fresh.includes(x))) check(await sb().from('players').update(r.p).eq('id', r.id!))
  const ms = rows.flatMap((r) => r.measures.map((m) => ({ player_id: r.id!, ...m })))
  if (ms.length) check(await sb().from('measures').upsert(ms, { onConflict: 'player_id,date' }))
  const ws = rows.flatMap((r) => (r.wellness ?? []).map((w) => ({
    player_id: r.id!, week: w.week, energy: w.energy, sleep: w.sleep, legs: w.legs, stress: w.stress, mood: w.mood,
    pain_zone: w.pain?.zone ?? null, pain_level: w.pain?.level ?? null, pain_side: w.pain?.side || null, pain_stopped: w.pain?.stopped ?? null, comment: w.comment ?? null,
  })))
  if (ws.length) {
    const owner = (await sb().auth.getUser()).data.user?.id
    check(await sb().from('wellness').upsert(ws.map((w) => ({ ...w, owner })), { onConflict: 'player_id,week' }))
  }
}
