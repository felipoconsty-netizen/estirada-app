import type { Player, Wellness } from './data'
import { fmt, wellnessScore, type Level } from './derive'
import { zone } from './i18n'
import type { Lang } from './phv'

export type Dim = 'energy' | 'sleep' | 'legs' | 'stress' | 'mood'
export const DIMS: Dim[] = ['energy', 'sleep', 'legs', 'stress', 'mood']

export interface Conclusion { level: Level; text: string }

const DIM_NAME: Record<Lang, Record<Dim, string>> = {
  ca: { energy: 'energia', sleep: 'son', legs: 'cames', stress: 'estrès', mood: 'ànim' },
  es: { energy: 'energía', sleep: 'sueño', legs: 'piernas', stress: 'estrés', mood: 'ánimo' },
}
const DIM_TIP: Record<Lang, Record<Dim, string>> = {
  ca: {
    energy: 'una sessió més curta o més lúdica pot anar bé',
    sleep: 'val la pena recordar hàbits de son (pantalles, hores) i no allargar els entrenaments tard',
    legs: 'convé baixar el volum de salts i curses aquesta setmana',
    stress: 'potser és època d’exàmens: baixa l’exigència i pregunta com van',
    mood: 'una estona de grup o una xerrada curta pot ajudar',
  },
  es: {
    energy: 'una sesión más corta o más lúdica puede ir bien',
    sleep: 'vale la pena recordar hábitos de sueño (pantallas, horas) y no alargar los entrenamientos tarde',
    legs: 'conviene bajar el volumen de saltos y carreras esta semana',
    stress: 'quizá es época de exámenes: baja la exigencia y pregunta cómo van',
    mood: 'un rato de grupo o una charla corta puede ayudar',
  },
}
const SIDE: Record<string, [string, string]> = { Esquerre: ['esquerre', 'izquierdo'], Dret: ['dret', 'derecho'], 'Tots dos': ['tots dos costats', 'ambos lados'] }

export const dimName = (d: Dim, lang: Lang) => DIM_NAME[lang][d]
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)
const trivial = (c?: string) => !c || /^(no|res|nada|nop?e?|-+|\.+|res a dir|nada que decir|cap|ninguna?)\.?$/i.test(c.trim())
const painText = (p: NonNullable<Wellness['pain']>, lang: Lang) => {
  const side = SIDE[p.side]?.[lang === 'es' ? 1 : 0] ?? p.side
  return `${zone(p.zone, lang).toLowerCase()}${side ? ` (${side})` : ''} ${p.level}/10`
}

/** Setmanes amb respostes, de la més antiga a la més recent (etiquetes d/m). */
export function surveyWeeks(players: Player[], current: string) {
  const [cd, cm] = current.split('/').map(Number)
  const key = (w: string) => { const [d, m] = w.split('/').map(Number); return (m > cm + 1 ? m - 12 : m) * 100 + d }
  return [...new Set([...players.flatMap((p) => p.wellness.map((w) => w.week)), current])]
    .filter((w) => key(w) <= cm * 100 + cd)
    .sort((a, b) => key(a) - key(b))
}

export const answerOf = (p: Player, week: string) => p.wellness.find((w) => w.week === week)

/** Conclusions automàtiques d'una setmana del qüestionari: participació, mitjanes, qui necessita atenció i per què. */
export function conclusions(players: Player[], weeks: string[], week: string, lang: Lang): Conclusion[] {
  const es = lang === 'es'
  const i = weeks.indexOf(week)
  const prevWeek = i > 0 ? weeks[i - 1] : undefined
  const done = players.filter((p) => answerOf(p, week))
  const missing = players.filter((p) => !answerOf(p, week))
  const out: Conclusion[] = []
  if (!done.length) return [{ level: 'info', text: es ? 'Nadie ha respondido todavía esta semana.' : 'Encara no ha respost ningú aquesta setmana.' }]

  out.push({
    level: missing.length > players.length / 3 ? 'warn' : 'ok',
    text: `${es ? 'Han respondido' : 'Han respost'} ${done.length} ${es ? 'de' : 'de'} ${players.length}.` + (missing.length ? ` ${es ? 'Faltan' : 'Falten'}: ${missing.map((p) => p.name).join(', ')}.` : ''),
  })

  // Mitjana de l'equip i evolució
  const ws = done.map((p) => answerOf(p, week)!)
  const teamNow = mean(ws.map(wellnessScore))
  const prevWs = prevWeek ? players.map((p) => answerOf(p, prevWeek)).filter((w): w is Wellness => !!w) : []
  const teamPrev = prevWs.length ? mean(prevWs.map(wellnessScore)) : null
  const delta = teamPrev === null ? '' : Math.abs(teamNow - teamPrev) < 0.15
    ? (es ? ', igual que la semana anterior' : ', igual que la setmana anterior')
    : `, ${teamNow > teamPrev ? (es ? 'mejor' : 'millor') : (es ? 'peor' : 'pitjor')} ${es ? 'que la semana anterior' : 'que la setmana anterior'} (${fmt(teamPrev)})`
  out.push({ level: teamNow < 3 ? 'bad' : teamNow < 3.5 ? 'warn' : 'ok', text: `${es ? 'Bienestar medio del equipo' : 'Benestar mitjà de l’equip'}: ${fmt(teamNow)}/5${delta}.` })

  // Punt fort i punt fluix
  const avg = DIMS.map((d) => [d, mean(ws.map((w) => w[d]))] as const).sort((a, b) => a[1] - b[1])
  const [weak, weakV] = avg[0]
  const [strong, strongV] = avg[avg.length - 1]
  if (weakV < 3.5) out.push({ level: weakV < 3 ? 'bad' : 'warn', text: `${es ? 'El punto más flojo del equipo es' : 'El punt més fluix de l’equip és'} ${es ? 'el' : 'el'} ${dimName(weak, lang)} (${fmt(weakV)}/5): ${DIM_TIP[lang][weak]}.` })
  if (strongV >= 4) out.push({ level: 'ok', text: `${es ? 'Lo mejor' : 'El millor'}: ${dimName(strong, lang)} (${fmt(strongV)}/5).` })

  // Dolor
  for (const p of done) {
    const w = answerOf(p, week)!
    if (w.pain) {
      let streak = 0
      for (let j = i; j >= 0 && answerOf(p, weeks[j])?.pain; j--) streak++
      out.push({
        level: w.pain.level >= 4 || w.pain.stopped ? 'bad' : 'warn',
        text: `${p.name}: ${es ? 'dolor de' : 'dolor de'} ${painText(w.pain, lang)}` + (w.pain.stopped ? (es ? ', no ha podido entrenar' : ', no ha pogut entrenar') : '') + (streak >= 2 ? ` · ${streak} ${es ? 'semanas seguidas' : 'setmanes seguides'}` : '') + `. ${es ? 'Revisar antes de entrenar.' : 'Revisa-ho abans d’entrenar.'}`,
      })
    } else if (prevWeek && answerOf(p, prevWeek)?.pain) {
      out.push({ level: 'ok', text: `${p.name} ${es ? 'ya no tiene dolor' : 'ja no té dolor'} (${es ? 'la semana pasada' : 'la setmana passada'}: ${painText(answerOf(p, prevWeek)!.pain!, lang)}).` })
    }
  }
  for (const p of missing) {
    const last = [...p.wellness].reverse().find((w) => weeks.indexOf(w.week) < i)
    if (last?.pain) out.push({ level: 'warn', text: `${p.name} ${es ? 'no ha respondido y la última vez tenía dolor de' : 'no ha respost i l’última vegada tenia dolor de'} ${painText(last.pain, lang)}. ${es ? 'Pregúntale.' : 'Pregunta-li.'}` })
  }

  // Qui necessita una conversa
  for (const p of done) {
    const w = answerOf(p, week)!
    const low = DIMS.filter((d) => w[d] <= 2)
    const prev = weeks.slice(Math.max(0, i - 4), i).map((x) => answerOf(p, x)).filter((x): x is Wellness => !!x)
    const prevAvg = prev.length ? mean(prev.map(wellnessScore)) : null
    const now = wellnessScore(w)
    const reasons: string[] = []
    if (low.length) reasons.push(low.map((d) => `${dimName(d, lang)} ${w[d]}/5`).join(', '))
    const repeated = low.filter((d) => prevWeek && (answerOf(p, prevWeek)?.[d] ?? 5) <= 2)
    if (repeated.length) reasons.push(`${repeated.map((d) => dimName(d, lang)).join(', ')} ${es ? 'baja también la semana anterior' : 'baix també la setmana anterior'}`)
    if (prevAvg !== null && now <= prevAvg - 0.8) reasons.push(`${es ? 'ha bajado' : 'ha baixat'} ${fmt(prevAvg)} → ${fmt(now)}`)
    if (reasons.length) out.push({ level: low.some((d) => w[d] === 1) || now < 2.6 ? 'bad' : 'warn', text: `${es ? 'Habla con' : 'Parla amb'} ${p.name}: ${reasons.join('; ')}.` })
    else if (prevAvg !== null && now >= prevAvg + 0.8) out.push({ level: 'ok', text: `${p.name} ${es ? 'está mucho mejor' : 'està molt millor'} (${fmt(prevAvg)} → ${fmt(now)}).` })
  }

  // Comentaris
  for (const p of done) {
    const c = answerOf(p, week)!.comment
    if (!trivial(c)) out.push({ level: 'info', text: `${p.name} ${es ? 'comenta' : 'comenta'}: «${c!.trim()}»` })
  }

  if (!out.some((c) => c.level === 'bad' || c.level === 'warn')) out.push({ level: 'ok', text: es ? 'Semana tranquila: ninguna alerta.' : 'Setmana tranquil·la: cap avís.' })
  return out
}
