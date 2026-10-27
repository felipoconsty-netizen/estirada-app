// Dies d'entreno de cada equip: 1 = dilluns … 7 = diumenge (ISO).
import type { Lang } from './phv'

export const WEEK = [1, 2, 3, 4, 5, 6, 7]
export const DAY_SHORT: Record<Lang, string[]> = {
  ca: ['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'],
  es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
}
const DAY_LONG: Record<Lang, string[]> = {
  ca: ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
}

const at = (iso: string) => new Date(iso + 'T12:00:00')
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (s: string, n: number) => { const d = at(s); d.setDate(d.getDate() + n); return iso(d) }
export const isoDow = (s: string) => ((at(s).getDay() + 6) % 7) + 1

/** "dimarts, dijous i divendres" */
export function daysText(days: number[], lang: Lang) {
  const names = [...days].sort().map((d) => DAY_LONG[lang][d - 1])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'i'} ${names.at(-1)}` : names[0] ?? ''
}

export const isTrainingDay = (days: number[] | undefined, day: string) => !!days?.includes(isoDow(day))

/** Últim dia d'entreno fins avui (inclòs). Sense dies definits, avui. */
export function lastSession(days: number[] | undefined, today: string) {
  if (!days?.length) return today
  for (let i = 0; i < 7; i++) { const d = shift(today, -i); if (days.includes(isoDow(d))) return d }
  return today
}

/** Proper dia d'entreno a partir de demà, amb el nom del dia ("dijous 29"). */
export function nextSession(days: number[], today: string, lang: Lang) {
  for (let i = 1; i <= 7; i++) {
    const d = shift(today, i)
    if (days.includes(isoDow(d))) return { date: d, label: `${DAY_LONG[lang][isoDow(d) - 1]} ${at(d).getDate()}`, tomorrow: i === 1 }
  }
  return null
}

/** Dies d'entreno dels últims n dies (inclòs avui). */
export function pastSessions(days: number[], today: string, n = 28) {
  return Array.from({ length: n }, (_, i) => shift(today, -i)).filter((d) => days.includes(isoDow(d)))
}
