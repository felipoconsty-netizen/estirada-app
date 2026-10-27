import type { Player, Team, Wellness } from './data'
import { ageAt, growthVelocity, maturityOffset, phaseOf, targetHeight, type Lang, type Phase, type PhaseKey } from './phv'
import { zone } from './i18n'
import { daysSinceMeasure, loadAlert, loadView, measureEvery, type LoadView } from './load'

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
  growthPain: string | null // dolor típic del creixement (Osgood, Sever…)
  load: LoadView
  measureDays: number // dies des de l'última mesura
  measureDue: boolean
  alerts: Alert[]
  level: 'ok' | 'warn' | 'bad'
}

export const wellnessScore = (w: Wellness) => (w.energy + w.sleep + w.legs + w.stress + w.mood) / 5

const rank = { ok: 0, info: 0, warn: 1, bad: 2 } as const

/** Fase segons l'última mesura. */
export function phaseNow(p: Player): Phase | null {
  const m = p.measures[p.measures.length - 1]
  return m ? phaseOf(maturityOffset(p.sex, ageAt(p.dob, m.date), m)) : null
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Creua la zona del dolor amb la fase: genoll o taló a prop del pic són els dolors típics del creixement. */
export function growthPain(phase: PhaseKey, painZone: string, lang: Lang): string | null {
  if (phase === 'pre' || phase === 'post') return null
  const z = fold(painZone)
  const es = lang === 'es'
  if (/genoll|rodilla|knee|rotul/.test(z)) return es
    ? 'Posible Osgood-Schlatter (rodilla durante el estirón). Que lo mire el fisio y reduce los saltos.'
    : 'Possible Osgood-Schlatter (genoll durant l’estirada). Que ho miri el fisio i redueix els salts.'
  if (/talo|heel|aquil/.test(z)) return es
    ? 'Posible Sever (talón durante el estirón). Que lo mire el fisio y reduce carreras y saltos.'
    : 'Possible Sever (taló durant l’estirada). Que ho miri el fisio i redueix curses i salts.'
  if (phase === 'plena' && /esquena|espalda|lumbar|back/.test(z)) return es
    ? 'Dolor de espalda en pleno estirón. Si dura más de una semana, que lo mire el fisio.'
    : 'Dolor d’esquena en plena estirada. Si dura més d’una setmana, que ho miri el fisio.'
  return null
}

export function derive(p: Player, lang: Lang, today: string): PlayerView | null {
  const es = lang === 'es'
  const m = p.measures[p.measures.length - 1]
  if (!m) return null
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
  const gPain = pain ? growthPain(phase.key, pain.zone, lang) : null
  const load = loadView(p.loads, today)
  const measureDays = daysSinceMeasure(p, today) ?? 0
  const measureDue = measureDays > measureEvery(phase.key)

  const alerts: Alert[] = []
  if (phase.key === 'plena') alerts.push({ level: 'bad', text: es ? 'En pleno estirón: menos saltos e impactos' : 'En plena estirada: menys salts i impactes' })
  else if (phase.level === 'warn') alerts.push({ level: 'warn', text: `${phase.label[lang]}: ${es ? 'vigilar la carga' : 'vigilar la càrrega'}` })
  if (velocity !== null && velocity >= 7.5) alerts.push({ level: 'warn', text: `${es ? 'Crece rápido' : 'Creix ràpid'}: ${fmt(velocity)} ${es ? 'cm/año' : 'cm/any'}` })
  if (pain) {
    const lvl: Level = pain.level >= 4 || pain.stopped ? 'bad' : 'warn'
    const weeks = streak >= 2 ? ` · ${streak} ${es ? 'semanas seguidas' : 'setmanes seguides'}` : ''
    alerts.push({ level: lvl, text: `${es ? 'Dolor' : 'Dolor'}: ${zone(pain.zone, lang).toLowerCase()} ${pain.level}/10${weeks}` })
    if (pain.stopped) alerts.push({ level: 'bad', text: es ? 'No ha podido entrenar esta semana' : 'No ha pogut entrenar aquesta setmana' })
    if (gPain) alerts.push({ level: pain.level >= 4 || streak >= 2 || pain.stopped ? 'bad' : 'warn', text: gPain })
  }
  const la = loadAlert(load, phase.key, lang)
  if (la) alerts.push(la)
  if (measureDue) alerts.push({ level: 'info', text: es ? `Hace ${Math.floor(measureDays / 7)} semanas que no se mide` : `Fa ${Math.floor(measureDays / 7)} setmanes que no es mesura` })
  if (prev.length && now <= prevAvg - 0.8) alerts.push({ level: 'warn', text: es ? 'Bienestar a la baja respecto a las últimas semanas' : 'Benestar a la baixa respecte a les últimes setmanes' })
  if (last?.comment) alerts.push({ level: 'info', text: `${es ? 'Comentario' : 'Comentari'}: «${last.comment}»` })

  const level = alerts.reduce<'ok' | 'warn' | 'bad'>((acc, a) => (rank[a.level] > rank[acc] ? (a.level as 'warn' | 'bad') : acc), 'ok')

  return {
    p, age, offset, phvAge: age - offset, phase, velocity, height: m.height, target,
    pctAdult: Math.min(100, (m.height / target) * 100),
    wellnessSeries: series, wellnessNow: now, pain, growthPain: gPain, load, measureDays, measureDue, alerts, level,
  }
}

export function deriveTeam(t: Team, lang: Lang, today: string): PlayerView[] {
  return t.players.map((p) => derive(p, lang, today)).filter((v): v is PlayerView => v !== null)
}

export function fmt(n: number, d = 1) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function signed(n: number) {
  if (!Number.isFinite(n)) return '—'
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
  const pain = views.filter((v) => v.pain && (v.pain.level >= 4 || v.pain.stopped) && !v.growthPain)
  const lowW = views.filter((v) => v.alerts.some((a) => a.text.startsWith('Benestar') || a.text.startsWith('Bienestar')))
  const fast = views.filter((v) => v.velocity !== null && v.velocity >= 7.5)
  const gp = views.filter((v) => v.growthPain)
  const heavy = views.filter((v) => v.alerts.some((a) => a.text.startsWith('Càrrega') || a.text.startsWith('Carga')))
  const due = views.filter((v) => v.measureDue)
  const one = (vs: PlayerView[]) => vs.length === 1
  if (plena.length) out.push({ level: 'bad', text: es
    ? `${list(plena, lang)} ${one(plena) ? 'está' : 'están'} en pleno estirón. Reduce saltos y esprints máximos, y prioriza técnica y movilidad.`
    : `${list(plena, lang)} ${one(plena) ? 'està' : 'estan'} en plena estirada. Redueix salts i esprints màxims, i prioritza tècnica i mobilitat.` })
  if (pain.length) out.push({ level: 'bad', text: es
    ? `${list(pain, lang)} ${one(pain) ? 'tiene' : 'tienen'} dolor fuerte o repetido. Háblalo antes de entrenar y, si sigue, que lo vea el fisio.`
    : `${list(pain, lang)} ${one(pain) ? 'té' : 'tenen'} dolor fort o repetit. Parla-hi abans d'entrenar i, si continua, que ho miri el fisio.` })
  for (const v of gp) out.push({ level: 'bad', text: `${firstName(v.p.name)}: ${v.growthPain}` })
  if (heavy.length) out.push({ level: 'warn', text: es
    ? `${list(heavy, lang)} ${one(heavy) ? 'ha acumulado' : 'han acumulado'} mucha más carga que su media del mes. Haz una sesión más suave o con menos minutos.`
    : `${list(heavy, lang)} ${one(heavy) ? 'ha acumulat' : 'han acumulat'} molta més càrrega que la seva mitjana del mes. Fes una sessió més suau o amb menys minuts.` })
  if (fast.length) out.push({ level: 'warn', text: es
    ? `${list(fast, lang)} ${one(fast) ? 'ha crecido' : 'han crecido'} muy deprisa desde la última medición. Puede notarse más descoordinación.`
    : `${list(fast, lang)} ${one(fast) ? 'ha crescut' : 'han crescut'} molt de pressa des de l'última mesura. Es pot notar més descoordinació.` })
  if (lowW.length) out.push({ level: 'warn', text: es
    ? `${list(lowW, lang)} ${one(lowW) ? 'dice' : 'dicen'} que se encuentra${one(lowW) ? '' : 'n'} peor que otras semanas. Una charla corta puede ayudar.`
    : `${list(lowW, lang)} ${one(lowW) ? 'diu que es troba' : 'diuen que es troben'} pitjor que altres setmanes. Una conversa curta pot ajudar.` })
  if (due.length) out.push({ level: 'info', text: es
    ? `Toca medir a ${list(due, lang)}: sin medidas recientes la fase de maduración queda desfasada.`
    : `Toca mesurar ${list(due, lang)}: sense mesures recents la fase de maduració queda desfasada.` })
  if (!out.some((o) => o.level !== 'info')) out.push({ level: 'ok', text: es ? 'Semana tranquila: ningún aviso importante en el equipo.' : "Setmana tranquil·la: cap avís important a l'equip." })
  return out
}

function list(vs: PlayerView[], lang: Lang) {
  const n = vs.map((v) => firstName(v.p.name))
  if (n.length === 1) return n[0]
  return n.slice(0, -1).join(', ') + (lang === 'es' ? ' y ' : ' i ') + n[n.length - 1]
}
