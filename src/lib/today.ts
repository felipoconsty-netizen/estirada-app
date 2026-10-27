// "Entrenament d'avui": una sola ordre per jugadora, a partir de tots els avisos.
import type { PlayerView } from './derive'
import { growthPain } from './derive'
import { loadAlert } from './load'
import type { Lang } from './phv'

export type Order = 'stop' | 'less' | 'light' | 'normal'
export const ORDERS: Order[] = ['stop', 'less', 'light', 'normal']
export const ORDER_LEVEL: Record<Order, 'bad' | 'warn' | 'info' | 'ok'> = { stop: 'bad', less: 'warn', light: 'info', normal: 'ok' }

export const ORDER_LABEL: Record<Lang, Record<Order, string>> = {
  ca: { stop: 'Només tècnica i mobilitat', less: 'Menys salts i esprints', light: 'Sessió més suau', normal: 'Normal' },
  es: { stop: 'Solo técnica y movilidad', less: 'Menos saltos y esprints', light: 'Sesión más suave', normal: 'Normal' },
}

/** Ordre del dia d'una jugadora; talk = cal parlar-hi abans d'entrenar. */
export interface TodayRow { v: PlayerView; order: Order; talk: boolean; reasons: string[] }

/** Decideix l'ordre del dia: la més restrictiva que toqui, amb els motius curts. */
export function todayOrder(v: PlayerView, lang: Lang): TodayRow {
  const es = lang === 'es'
  const reasons: string[] = []
  const flags = new Set<Order>()
  let talk = false
  const pain = v.pain
  const openInj = v.p.injuries.filter((i) => i.status === 'oberta')

  if (pain?.stopped) { flags.add('stop'); reasons.push(es ? 'no pudo entrenar por dolor' : 'no va poder entrenar per dolor') }
  else if (pain && pain.level >= 6) { flags.add('stop'); reasons.push(`${es ? 'dolor' : 'dolor'} ${pain.level}/10`) }
  if (openInj.length) { flags.add('stop'); reasons.push(`${es ? 'lesión abierta' : 'lesió oberta'}: ${openInj.map((i) => i.zone.toLowerCase()).join(', ')}`) }
  const gp = pain ? growthPain(v.phase.key, pain.zone, lang) : null
  if (gp) { flags.add(pain!.level >= 4 ? 'stop' : 'less'); reasons.push(gp.split(' (')[0]) }
  else if (pain && pain.level >= 3 && !pain.stopped && pain.level < 6) { flags.add('less'); reasons.push(`${es ? 'dolor' : 'dolor'} ${pain.level}/10`) }

  if (v.phase.key === 'plena') { flags.add('less'); reasons.push(es ? 'en pleno estirón' : 'en plena estirada') }
  if (v.fast) { flags.add('less'); reasons.push(es ? 'crece rápido' : 'creix ràpid') }
  const la = loadAlert(v.load, v.phase.key, lang, v.fast || v.band === 'pic')
  if (la) { flags.add('light'); reasons.push(`${es ? 'carga' : 'càrrega'} ×${v.load.ratio!.toLocaleString('es-ES', { maximumFractionDigits: 1 })}`) }

  const low = v.alerts.some((a) => a.text.startsWith('Benestar') || a.text.startsWith('Bienestar'))
  if (low) { talk = true; reasons.push(es ? 'se encuentra peor' : 'es troba pitjor') }
  if (v.shortSleep) { talk = true; reasons.push(es ? 'duerme poco' : 'dorm poc') }
  const comment = v.p.wellness.at(-1)?.comment
  if (comment) { talk = true; reasons.push(`«${comment}»`) }

  const order = ORDERS.find((o) => flags.has(o)) ?? 'normal'
  return { v, order, talk, reasons }
}

export function todayPlan(views: PlayerView[], lang: Lang): TodayRow[] {
  return views.map((v) => todayOrder(v, lang)).sort((a, b) => ORDERS.indexOf(a.order) - ORDERS.indexOf(b.order) || Number(b.talk) - Number(a.talk) || a.v.p.name.localeCompare(b.v.p.name))
}
