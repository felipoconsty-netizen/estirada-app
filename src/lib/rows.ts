// Converteix les files de Supabase en equips amb jugadores. El fan servir l'app i el correu de dilluns.
import type { Injury, Load, Player, Team, Wellness } from './data'
import type { Measure, Sex } from './phv'

type Row = Record<string, unknown>
export interface Rows { teams: Row[]; players: Row[]; measures: Row[]; wellness: Row[]; injuries: Row[]; loads: Row[] }

const num = (v: unknown) => (v === null || v === undefined ? NaN : Number(v))

/** Etiqueta curta d/m per a una data ISO. */
export const weekLabel = (iso: string) => { const [, m, d] = iso.split('-'); return `${+d}/${+m}` }

export function assembleTeams({ teams, players, measures, wellness, injuries, loads }: Rows): (Team & { survey_token: string; owner: string })[] {
  const byPlayer = <T,>(rows: Row[], map: (r: Row) => T) => {
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
  const ls = byPlayer<Load>(loads, (r) => ({ id: r.id as string, date: r.date as string, kind: r.kind as Load['kind'], minutes: num(r.minutes), rpe: num(r.rpe) }))
  const is = byPlayer<Injury & { id: string }>(injuries, (r) => ({ id: r.id as string, date: r.date as string, zone: r.zone as string, note: r.note as string, status: r.status as Injury['status'] }))

  return teams.map((t) => ({
    id: t.id as string, name: t.name as string, sport: t.sport as string, coach: t.coach as string, survey_token: t.survey_token as string, owner: t.owner as string,
    players: players.filter((p) => p.team_id === t.id).map((p): Player => ({
      id: p.id as string, name: p.name as string, sex: p.sex as Sex, dob: p.dob as string,
      father: num(p.father), mother: num(p.mother),
      measures: ms.get(p.id as string) ?? [], wellness: (ws.get(p.id as string) ?? []).slice(-8), injuries: is.get(p.id as string) ?? [], loads: ls.get(p.id as string) ?? [],
    })),
  }))
}
