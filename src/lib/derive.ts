import type { Player, Team, Wellness } from './data'
import { ageAt, growthVelocity, maturityOffset, phaseOf, targetHeight, type Lang, type Phase } from './phv'
import { zone } from './i18n'

export type Level = 'ok' | 'warn' | 'bad' | 'info'

export interface Alert {
  level: Level
  text: string
}

export interface PlayerView {
  p: Player
  age: number
  offset: number
  phvAge: number
  phase: Phase
  velocity: number | null
  height: number
  target: number
  pctAdult: number
  wellnessSeries: number[]
  wellnessNow: number
  pain: Wellness['pain']
  alerts: Alert[]
  level: 'ok' | 'warn' | 'bad'
}

export const wellnessScore = (w: Wellness) => (w.energy + w.sleep + w.legs + w.stress + w.mood) / 5

const rank = { ok: 0, info: 0, warn: 1, bad: 2 } as const

export function derive(p: Player, lang: Lang): PlayerView {
  const es = lang === 'es'
  const m = p.measures[p.measures.length - 1]
  const age = ageAt(p.dob, m.date)
  const offset = maturityOffset(p.sex, age, m)
  const phase = phaseOf(offset)
  const velocity = growthVelocity(p.measures)
  const target = targetHeight(p.sex, p.father, p.mother)
  const series = p.wellness.map(wellnessScore)
  const now = series[series.length - 1]
  const prev = series.slice(-5, -1)
  const prevAvg = prev.reduce((a, b) => a + b, 0) / Math.max(prev.length, 1)
  const last = p.wellness[p.wellness.length - 1]
  const pain = last?.pain ?? null
  const painWeeks = [...p.wellness].reverse().findIndex((w) => !w.pain)
  const streak = painWeeks === -1 ? p.wellness.length : painWeeks

  const alerts: Alert[] = []
  if (phase.key === 'plena') alerts.push({ level: 'bad', text: es ? 'En pleno estirón: menos saltos e impactos' : 'En plena estirada: menys salts i impactes' })
  else if (phase.level === 'warn') alerts.push({ level: 'warn', text: `${phase.label[lang]}: ${es ? 'vigilar la carga' : 'vigilar la càrrega'}` })
  if (velocity !== null && velocity >= 7.5) alerts.push({ level: 'warn', text: `${es ? 'Crece rápido' : 'Creix ràpid'}: ${fmt(velocity)} ${es ? 'cm/año' : 'cm/any'}` })
  if (pain) {
    const lvl: Level = pain.level >= 4 || pain.stopped ? 'bad' : 'warn'
    const weeks = streak >= 2 ? ` · ${streak} ${es ? 'semanas seguidas' : 'setmanes seguides'}` : ''
    alerts.push({ level: lvl, text: `${es ? 'Dolor' : 'Dolor'}: ${zone(pain.zone, lang).toLowerCase()} ${pain.level}/10${weeks}` })
    if (pain.stopped) alerts.push({ level: 'bad', text: es ? 'No ha podido entrenar esta semana' : 'No ha pogut entrenar aquesta setmana' })
  }
  if (now <= prevAvg - 0.8) alerts.push({ level: 'warn', text: es ? 'Bienestar a la baja respecto a las últimas semanas' : 'Benestar a la baixa respecte a les últimes setmanes' })
  if (last?.comment) alerts.push({ level: 'info', text: `${es ? 'Comentario' : 'Comentari'}: «${last.comment}»` })

  const level = alerts.reduce<'ok' | 'warn' | 'bad'>((acc, a) => (rank[a.level] > rank[acc] ? (a.level as 'warn' | 'bad') : acc), 'ok')

  return {
    p, age, offset, phvAge: age - offset, phase, velocity, height: m.height, target,
    pctAdult: Math.min(100, (m.height / target) * 100),
    wellnessSeries: series, wellnessNow: now, pain, alerts, level,
  }
}

export function deriveTeam(t: Team, lang: Lang) {
  return t.players.map((p) => derive(p, lang))
}

export function fmt(n: number, d = 1) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function signed(n: number) {
  return (n >= 0 ? '+' : '−') + fmt(Math.abs(n))
}

export function firstName(name: string) {
  return name.split(' ')[0]
}

/** Text del resum de dilluns per a l'entrenador, generat a partir dels avisos. */
export function mondaySummary(views: PlayerView[], lang: Lang): { level: Level; text: string }[] {
  const es = lang === 'es'
  const out: { level: Level; text: string }[] = []
  const plena = views.filter((v) => v.phase.key === 'plena')
  const pain = views.filter((v) => v.pain && (v.pain.level >= 4 || v.pain.stopped))
  const lowW = views.filter((v) => v.alerts.some((a) => a.text.startsWith('Benestar') || a.text.startsWith('Bienestar')))
  const fast = views.filter((v) => v.velocity !== null && v.velocity >= 7.5)
  const one = (vs: PlayerView[]) => vs.length === 1
  if (plena.length) out.push({ level: 'bad', text: es
    ? `${list(plena, lang)} ${one(plena) ? 'está' : 'están'} en pleno estirón. Reduce saltos y esprints máximos, y prioriza técnica y movilidad.`
    : `${list(plena, lang)} ${one(plena) ? 'està' : 'estan'} en plena estirada. Redueix salts i esprints màxims, i prioritza tècnica i mobilitat.` })
  if (pain.length) out.push({ level: 'bad', text: es
    ? `${list(pain, lang)} ${one(pain) ? 'tiene' : 'tienen'} dolor fuerte o repetido. Háblalo antes de entrenar y, si sigue, que lo vea el fisio.`
    : `${list(pain, lang)} ${one(pain) ? 'té' : 'tenen'} dolor fort o repetit. Parla-hi abans d'entrenar i, si continua, que ho miri el fisio.` })
  if (fast.length) out.push({ level: 'warn', text: es
    ? `${list(fast, lang)} ${one(fast) ? 'ha crecido' : 'han crecido'} muy deprisa desde la última medición. Puede notarse más descoordinación.`
    : `${list(fast, lang)} ${one(fast) ? 'ha crescut' : 'han crescut'} molt de pressa des de l'última mesura. Es pot notar més descoordinació.` })
  if (lowW.length) out.push({ level: 'warn', text: es
    ? `${list(lowW, lang)} ${one(lowW) ? 'dice' : 'dicen'} que se encuentra${one(lowW) ? '' : 'n'} peor que otras semanas. Una charla corta puede ayudar.`
    : `${list(lowW, lang)} ${one(lowW) ? 'diu' : 'diuen'} que es troba${one(lowW) ? '' : 'n'} pitjor que altres setmanes. Una conversa curta pot ajudar.` })
  if (!out.length) out.push({ level: 'ok', text: es ? 'Semana tranquila: ningún aviso importante en el equipo.' : "Setmana tranquil·la: cap avís important a l'equip." })
  return out
}

function list(vs: PlayerView[], lang: Lang) {
  const n = vs.map((v) => firstName(v.p.name))
  if (n.length === 1) return n[0]
  return n.slice(0, -1).join(', ') + (lang === 'es' ? ' y ' : ' i ') + n[n.length - 1]
}
