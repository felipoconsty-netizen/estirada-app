// Càrrega d'entrenament (sRPE: minuts × esforç percebut 1–10) i recordatoris de mesura.
import type { Load, Player } from './data'
import type { Lang, PhaseKey } from './phv'

const DAY = 24 * 3600 * 1000
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to + 'T12:00:00') - Date.parse(from + 'T12:00:00')) / DAY)
export const sessionLoad = (l: Load) => l.minutes * l.rpe

export interface LoadView {
  week: number // càrrega dels últims 7 dies (UA)
  avg: number | null // mitjana setmanal de les últimes 4 setmanes, si n'hi ha prou dades
  ratio: number | null // setmana / mitjana (ràtio aguda:crònica)
  sessions: number // sessions dels últims 7 dies
  lastRpe: number | null
}

/** Resum de càrrega d'una jugadora a una data. Cal que faci almenys 3 setmanes que hi ha dades per calcular la ràtio. */
export function loadView(loads: Load[], today: string): LoadView {
  const past = loads.filter((l) => daysBetween(l.date, today) >= 0)
  const within = (n: number) => past.filter((l) => daysBetween(l.date, today) < n)
  const sum = (ls: Load[]) => ls.reduce((a, l) => a + sessionLoad(l), 0)
  const week = sum(within(7))
  const first = past.reduce<string | null>((a, l) => (!a || l.date < a ? l.date : a), null)
  const avg = first && daysBetween(first, today) >= 21 ? sum(within(28)) / 4 : null
  const last = [...past].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  return { week, avg, ratio: avg ? week / avg : null, sessions: within(7).length, lastRpe: last?.rpe ?? null }
}

export const growing = (k: PhaseKey) => k === 'entrant' || k === 'plena'

/** Avís quan la càrrega de la setmana puja de cop. A prop del pic, o si creix ràpid, el llindar és més baix. */
export function loadAlert(v: LoadView, phase: PhaseKey, lang: Lang, fast = false): { level: 'warn' | 'bad'; text: string } | null {
  if (v.ratio === null) return null
  const g = growing(phase) || fast
  if (v.ratio < (g ? 1.3 : 1.5)) return null
  const es = lang === 'es'
  const x = v.ratio.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  return {
    level: v.ratio >= 1.5 && g ? 'bad' : 'warn',
    text: es ? `Carga disparada: ×${x} respecto a su media del mes${g ? ' y está creciendo' : ''}` : `Càrrega disparada: ×${x} respecte a la seva mitjana del mes${g ? ' i està creixent' : ''}`,
  }
}

/** Dies màxims entre mesures: cada 6 setmanes a prop del pic, cada 12 la resta. */
export const measureEvery = (k: PhaseKey) => (growing(k) ? 42 : 84)

/** Dies des de l'última mesura, o null si no se n'ha fet cap. */
export const daysSinceMeasure = (p: Player, today: string) => {
  const last = p.measures.at(-1)
  return last ? daysBetween(last.date, today) : null
}

/** Càrrega de cada bloc de 7 dies, del més antic al que acaba avui. */
export function weeklyLoads(loads: Load[], today: string, n = 6): number[] {
  return Array.from({ length: n }, (_, i) => {
    const from = (n - 1 - i) * 7
    return loads.filter((l) => { const d = daysBetween(l.date, today); return d >= from && d < from + 7 }).reduce((a, l) => a + sessionLoad(l), 0)
  })
}

/** Etiqueta d/m del primer dia de cada bloc de weeklyLoads. */
export function weeklyLabels(today: string, n = 6): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - (n - 1 - i) * 7 - 6)
    return `${d.getDate()}/${d.getMonth() + 1}`
  })
}
