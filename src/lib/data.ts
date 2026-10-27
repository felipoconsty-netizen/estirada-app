// Dades inventades per a la demo. Cap nom ni dada correspon a cap persona real.
import type { Measure, Sex } from './phv'

export const TODAY = '2026-10-05'
export const MEASURE_DATES = ['2026-03-20', '2026-06-15', '2026-09-23']
export const WEEKS = ['17/8', '24/8', '31/8', '7/9', '14/9', '21/9', '28/9', '5/10']

export interface Wellness {
  week: string
  energy: number // 1-5 (5 = molt bé)
  sleep: number
  legs: number
  stress: number
  mood: number
  sleepHours?: number // hores de son per nit (aprox.)
  pain: { zone: string; level: number; side: string; stopped: boolean } | null
  comment?: string
}

export interface Injury {
  id?: string
  date: string
  zone: string
  note: string
  status: 'oberta' | 'tancada'
}

/** Sessió d'entrenament o partit: càrrega = minuts × esforç percebut (sRPE, 1–10). */
export interface Load {
  id?: string
  date: string // ISO
  kind: 'entreno' | 'partit'
  minutes: number
  rpe: number
}

export interface Player {
  id: string
  name: string
  sex: Sex
  dob: string
  father: number
  mother: number
  measures: Measure[]
  wellness: Wellness[]
  injuries: Injury[]
  loads: Load[]
}

export interface Team {
  id: string
  name: string
  sport: string
  coach: string
  players: Player[]
  warmups?: string[] // dies (ISO) en què s'ha fet l'escalfament de prevenció
  days?: number[] // dies d'entreno: 1 = dilluns … 7 = diumenge
  role?: Role // el meu rol en aquest equip (només a l'app real)
}

export type Role = 'owner' | 'director' | 'entrenador' | 'fisio'

// Generador pseudoaleatori estable perquè la demo surti sempre igual.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function yearsFrom(date: string, years: number): string {
  const d = new Date(date)
  d.setTime(d.getTime() - years * 365.25 * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

interface Spec {
  name: string
  age: number // edat el dia de la darrera mesura
  phvAge: number // edat real del pic (per generar la corba)
  adult: number
  bmi: number
  pain?: { from: number; zone: string; levels: number[]; side: string; stopped?: boolean }
  dip?: number // setmana en què el benestar baixa
  injuries?: Injury[]
  comment?: string
  spike?: boolean // la darrera setmana ha entrenat molt més (dos equips, campus…)
  stale?: boolean // fa mesos que no es mesura
  shortSleep?: boolean // dorm poc les últimes setmanes
}

/** Sis setmanes d'entrenaments (dl, dc, dj) i partit en dissabte fins a TODAY. */
function buildLoads(spec: Spec, r: () => number): Load[] {
  const out: Load[] = []
  const end = new Date(TODAY + 'T12:00:00')
  for (let back = 42; back >= 0; back--) {
    const d = new Date(end); d.setDate(d.getDate() - back)
    const dow = d.getDay()
    const date = d.toISOString().slice(0, 10)
    const recent = back < 7
    if ([1, 3, 4].includes(dow)) out.push({ date, kind: 'entreno', minutes: 90, rpe: Math.round(4 + r() * 3) })
    else if (dow === 6) out.push({ date, kind: 'partit', minutes: Math.round(20 + r() * 15), rpe: Math.round(6 + r() * 3) })
    if (spec.spike && recent && [2, 5, 0].includes(dow)) out.push({ date, kind: dow === 0 ? 'partit' : 'entreno', minutes: dow === 0 ? 40 : 90, rpe: Math.round(6 + r() * 3) })
  }
  return out
}

function build(sex: Sex, spec: Spec, seed: number): Player {
  const r = rng(seed)
  const last = MEASURE_DATES[MEASURE_DATES.length - 1]
  const dob = yearsFrom(last, spec.age)
  const spurt = sex === 'F' ? 30 : 36
  const k = sex === 'F' ? 1.05 : 0.95
  const heightAt = (age: number) => spec.adult - spurt + spurt / (1 + Math.exp(-k * (age - spec.phvAge))) - 6 * Math.exp(-(age - 9) / 3) * 0.2
  const measures: Measure[] = (spec.stale ? MEASURE_DATES.slice(0, 2) : MEASURE_DATES).map((d) => {
    const a = spec.age - (new Date(last).getTime() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000)
    const h = Math.round((heightAt(a) + (r() - 0.5) * 0.6) * 10) / 10
    const sitRatio = sex === 'F' ? 0.515 + (a - 13) * 0.004 : 0.505 + (a - 13) * 0.005
    const sitting = Math.round(h * (sitRatio + (r() - 0.5) * 0.01) * 10) / 10
    const mass = Math.round(spec.bmi * (h / 100) ** 2 * (0.97 + (a - spec.age + 1) * 0.03) * 10) / 10
    return { date: d, height: h, sitting, mass }
  })
  const fatherBase = sex === 'F' ? spec.adult + 12 : spec.adult - 1
  const father = Math.round(fatherBase + (r() - 0.5) * 8)
  const mother = Math.round((sex === 'F' ? 2 * spec.adult + 13 : 2 * spec.adult - 13) - father + (r() - 0.5) * 4)
  const wellness: Wellness[] = WEEKS.map((w, i) => {
    const base = 3.6 + r() * 0.8
    const dip = spec.dip !== undefined && i >= spec.dip ? 1.3 : 0
    const v = () => Math.max(1, Math.min(5, Math.round(base - dip + (r() - 0.5) * 1.4)))
    const p = spec.pain && i >= spec.pain.from
      ? { zone: spec.pain.zone, level: spec.pain.levels[Math.min(i - spec.pain.from, spec.pain.levels.length - 1)], side: spec.pain.side, stopped: !!spec.pain.stopped && i === WEEKS.length - 1 }
      : null
    const hours = spec.shortSleep && i >= WEEKS.length - 3 ? 6.5 + Math.round(r()) * 0.5 : 8 + Math.round(r() * 3) * 0.5
    return { week: w, energy: v(), sleep: v(), legs: v(), stress: v(), mood: v(), sleepHours: hours, pain: p, comment: i === WEEKS.length - 1 ? spec.comment : undefined }
  })
  return {
    id: spec.name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''),
    name: spec.name,
    sex,
    dob,
    father,
    mother,
    measures,
    wellness,
    injuries: spec.injuries ?? [],
    loads: buildLoads(spec, r),
  }
}

const cadetF: Spec[] = [
  { name: 'Laia Ferrer', age: 12.9, phvAge: 13.3, adult: 170, bmi: 18.2, pain: { from: 5, zone: 'Genoll', levels: [3, 4, 5], side: 'Dret' }, comment: 'Em fa mal el genoll quan salto' },
  { name: 'Júlia Soler', age: 14.6, phvAge: 12.6, adult: 166, bmi: 19.8 },
  { name: 'Noa Puig', age: 14.2, phvAge: 12.4, adult: 162, bmi: 20.5 },
  { name: 'Mariona Vidal', age: 13.9, phvAge: 12.3, adult: 172, bmi: 17.4 },
  { name: 'Aina Roca', age: 14.8, phvAge: 11.9, adult: 160, bmi: 22.1 },
  { name: 'Clara Serra', age: 13.6, phvAge: 12.9, adult: 168, bmi: 18.6, dip: 6, spike: true, shortSleep: true, comment: 'Molts exàmens aquesta setmana' },
  { name: 'Ona Font', age: 14.4, phvAge: 12.1, adult: 165, bmi: 19.1, injuries: [{ date: '2026-09-12', zone: 'Turmell esquerre', note: 'Esquinç lleu en partit', status: 'tancada' }] },
  { name: 'Paula Martí', age: 14.0, phvAge: 12.7, adult: 175, bmi: 18.0 },
  { name: 'Emma Costa', age: 13.2, phvAge: 12.6, adult: 164, bmi: 18.9, pain: { from: 6, zone: 'Taló', levels: [2, 3], side: 'Esquerre' } },
  { name: 'Berta Pons', age: 14.5, phvAge: 11.8, adult: 158, bmi: 21.4 },
  { name: 'Txell Riera', age: 14.1, phvAge: 12.2, adult: 167, bmi: 19.5, stale: true },
  { name: 'Irene Mas', age: 13.7, phvAge: 12.0, adult: 163, bmi: 20.0 },
]

const infantilF: Spec[] = [
  { name: 'Lia Camps', age: 12.3, phvAge: 12.0, adult: 166, bmi: 17.6 },
  { name: 'Abril Sala', age: 12.6, phvAge: 11.6, adult: 161, bmi: 18.4 },
  { name: 'Martina Bosch', age: 11.2, phvAge: 12.4, adult: 169, bmi: 16.9 },
  { name: 'Carla Pujol', age: 12.1, phvAge: 11.9, adult: 164, bmi: 17.8, pain: { from: 4, zone: 'Genoll', levels: [2, 3, 3, 4], side: 'Esquerre' } },
  { name: 'Nora Valls', age: 13.3, phvAge: 11.4, adult: 160, bmi: 19.2 },
  { name: 'Gemma Prat', age: 11.6, phvAge: 12.6, adult: 171, bmi: 17.1, stale: true },
  { name: 'Joana Bru', age: 11.5, phvAge: 11.7, adult: 165, bmi: 17.5 },
  { name: 'Sira Comas', age: 13.1, phvAge: 11.5, adult: 159, bmi: 19.6, dip: 5 },
  { name: 'Elna Rius', age: 11.3, phvAge: 12.9, adult: 173, bmi: 16.5 },
  { name: 'Vinyet Coll', age: 12.5, phvAge: 11.8, adult: 162, bmi: 18.1 },
]

const infantilM: Spec[] = [
  { name: 'Pol Grau', age: 13.6, phvAge: 13.7, adult: 182, bmi: 18.3, pain: { from: 5, zone: 'Genoll', levels: [3, 4, 4], side: 'Dret', stopped: true } },
  { name: 'Marc Oliva', age: 13.2, phvAge: 14.3, adult: 178, bmi: 17.6 },
  { name: 'Biel Torres', age: 13.9, phvAge: 13.2, adult: 185, bmi: 18.8, spike: true },
  { name: 'Nil Sabaté', age: 13.4, phvAge: 13.9, adult: 176, bmi: 19.4 },
  { name: 'Arnau Vila', age: 13.7, phvAge: 12.9, adult: 180, bmi: 18.0 },
  { name: 'Èric Serrat', age: 13.1, phvAge: 14.6, adult: 174, bmi: 17.2 },
  { name: 'Jan Mir', age: 13.8, phvAge: 13.5, adult: 188, bmi: 18.5, dip: 6, shortSleep: true },
  { name: 'Oriol Badia', age: 13.3, phvAge: 13.4, adult: 179, bmi: 20.1 },
  { name: 'Guillem Ros', age: 13.5, phvAge: 14.0, adult: 177, bmi: 18.9 },
  { name: 'Roc Esteve', age: 13.9, phvAge: 12.8, adult: 183, bmi: 19.0 },
]

/** Escalfaments de prevenció de les últimes 5 setmanes: els dies d'entrenament (dl, dc, dj), amb el compliment que es demani. */
function buildWarmups(rate: number, seed: number, days: number[]): string[] {
  const r = rng(seed)
  const out: string[] = []
  const end = new Date(TODAY + 'T12:00:00')
  for (let back = 35; back >= 0; back--) {
    const d = new Date(end); d.setDate(d.getDate() - back)
    if (days.includes(((d.getDay() + 6) % 7) + 1) && r() < rate) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export const CLUB = { name: 'CB Exemple', town: 'Granollers' }

export const TEAMS: Team[] = [
  { id: 'cadet-f', name: 'Cadet Femení A', sport: 'Bàsquet', coach: 'Entrenadora: Marta G.', players: cadetF.map((s, i) => build('F', s, 101 + i * 17)), warmups: buildWarmups(0.85, 7, [1, 3, 4]), days: [1, 3, 4] },
  { id: 'infantil-f', name: 'Infantil Femení', sport: 'Bàsquet', coach: 'Entrenador: Jordi P.', players: infantilF.map((s, i) => build('F', s, 501 + i * 13)), warmups: buildWarmups(0.45, 11, [2, 4]), days: [2, 4] },
  { id: 'infantil-m', name: 'Infantil Masculí', sport: 'Bàsquet', coach: 'Entrenador: Xavi R.', players: infantilM.map((s, i) => build('M', s, 901 + i * 11)), warmups: buildWarmups(0.2, 13, [2, 5]), days: [2, 5] },
]
