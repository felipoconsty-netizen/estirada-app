// Càlculs de maduració: Mirwald et al. (2002), els mateixos que fa servir l'Excel.

export type Sex = 'F' | 'M'

export interface Measure {
  date: string // ISO
  height: number // cm
  sitting: number // cm, alçada asseguda
  mass: number // kg
}

export function ageAt(dob: string, date: string): number {
  return (new Date(date).getTime() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)
}

export function maturityOffset(sex: Sex, age: number, m: Pick<Measure, 'height' | 'sitting' | 'mass'>): number {
  const leg = m.height - m.sitting
  const ratio = (m.mass / m.height) * 100
  if (sex === 'F') {
    return -9.376 + 0.0001882 * leg * m.sitting + 0.0022 * age * leg + 0.005841 * age * m.sitting
      - 0.002658 * age * m.mass + 0.07693 * ratio
  }
  return -9.236 + 0.0002708 * leg * m.sitting - 0.001663 * age * leg + 0.007216 * age * m.sitting + 0.02292 * ratio
}

export type PhaseKey = 'pre' | 'entrant' | 'plena' | 'sortint' | 'post'
export type Lang = 'ca' | 'es'

export interface Phase {
  key: PhaseKey
  label: Record<Lang, string>
  level: 'ok' | 'warn' | 'bad'
}

export const PHASES: Record<PhaseKey, Phase> = {
  pre: { key: 'pre', label: { ca: "Abans de l'estirada", es: 'Antes del estirón' }, level: 'ok' },
  entrant: { key: 'entrant', label: { ca: "Entrant a l'estirada", es: 'Entrando en el estirón' }, level: 'warn' },
  plena: { key: 'plena', label: { ca: 'En plena estirada', es: 'En pleno estirón' }, level: 'bad' },
  sortint: { key: 'sortint', label: { ca: "Sortint de l'estirada", es: 'Saliendo del estirón' }, level: 'warn' },
  post: { key: 'post', label: { ca: "Després de l'estirada", es: 'Después del estirón' }, level: 'ok' },
}

export function phaseOf(offset: number): Phase {
  if (offset < -1) return PHASES.pre
  if (offset < -0.5) return PHASES.entrant
  if (offset <= 0.5) return PHASES.plena
  if (offset <= 1) return PHASES.sortint
  return PHASES.post
}

/** Alçada diana per mitjana parental (Tanner). */
export function targetHeight(sex: Sex, father: number, mother: number): number {
  return sex === 'F' ? (father + mother - 13) / 2 : (father + mother + 13) / 2
}

/** Velocitat de creixement en cm/any entre les dues últimes mesures. */
export function growthVelocity(measures: Measure[]): number | null {
  if (measures.length < 2) return null
  const a = measures[measures.length - 2]
  const b = measures[measures.length - 1]
  const years = (new Date(b.date).getTime() - new Date(a.date).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (years <= 0.05) return null
  return (b.height - a.height) / years
}

export interface Reco {
  prioritzar: string[]
  moderar: string[]
  evitar: string[]
  vigilar: string[]
}

export const RECOS: Record<Lang, Record<PhaseKey, Reco>> = {
  ca: {
    pre: {
      prioritzar: ['Coordinació i agilitat', 'Velocitat curta i canvis de direcció', 'Tècnica individual: bot, tir i passada', 'Força amb el pes corporal'],
      moderar: ['Partits seguits sense descans'],
      evitar: ['Especialitzar en una sola posició'],
      vigilar: ['Que no es desanimi davant de companys més madurs'],
    },
    entrant: {
      prioritzar: ["Tècnica d'aterratge i frenada", 'Mobilitat de maluc i turmell', 'Control del tronc'],
      moderar: ['Salts repetits i esprints', 'Minuts si juga dos partits seguits'],
      evitar: ['Pliometria intensa', 'Càrregues externes altes'],
      vigilar: ['Dolor al genoll (Osgood-Schlatter)', 'Dolor al taló (Sever)'],
    },
    plena: {
      prioritzar: ['Mobilitat i estiraments suaus', "Tècnica d'aterratge amb poc volum", 'Força amb pes corporal, molt controlada', 'Tècnica de tir i passada'],
      moderar: ['Salts i impactes: reduir-los clarament', 'Esprints màxims'],
      evitar: ['Pliometria i salts de caixa', 'Càrregues pesades', 'Dues sessions seguides sense descans'],
      vigilar: ['Genoll, taló i esquena', 'Pèrdua temporal de coordinació, que és normal'],
    },
    sortint: {
      prioritzar: ['Força general progressiva i supervisada', 'Pliometria baixa i progressiva', 'Recuperar la coordinació'],
      moderar: ['Volum de salts', 'Augments bruscos de càrrega'],
      evitar: ["Saltar-se l'escalfament"],
      vigilar: ['Tendó rotulià (molts salts)'],
    },
    post: {
      prioritzar: ['Força de tipus adult, supervisada', 'Potència i pliometria', 'Velocitat i resistència específica'],
      moderar: ['Càrrega total setmanal'],
      evitar: ['Entrenar sense progressió'],
      vigilar: ['Tendó rotulià', 'Turmells (esquinços)'],
    },
  },
  es: {
    pre: {
      prioritzar: ['Coordinación y agilidad', 'Velocidad corta y cambios de dirección', 'Técnica individual: bote, tiro y pase', 'Fuerza con el peso corporal'],
      moderar: ['Partidos seguidos sin descanso'],
      evitar: ['Especializar en una sola posición'],
      vigilar: ['Que no se desanime ante compañeros más maduros'],
    },
    entrant: {
      prioritzar: ['Técnica de aterrizaje y frenada', 'Movilidad de cadera y tobillo', 'Control del tronco'],
      moderar: ['Saltos repetidos y esprints', 'Minutos si juega dos partidos seguidos'],
      evitar: ['Pliometría intensa', 'Cargas externas altas'],
      vigilar: ['Dolor de rodilla (Osgood-Schlatter)', 'Dolor de talón (Sever)'],
    },
    plena: {
      prioritzar: ['Movilidad y estiramientos suaves', 'Técnica de aterrizaje con poco volumen', 'Fuerza con peso corporal, muy controlada', 'Técnica de tiro y pase'],
      moderar: ['Saltos e impactos: reducirlos claramente', 'Esprints máximos'],
      evitar: ['Pliometría y saltos al cajón', 'Cargas pesadas', 'Dos sesiones seguidas sin descanso'],
      vigilar: ['Rodilla, talón y espalda', 'Pérdida temporal de coordinación, que es normal'],
    },
    sortint: {
      prioritzar: ['Fuerza general progresiva y supervisada', 'Pliometría baja y progresiva', 'Recuperar la coordinación'],
      moderar: ['Volumen de saltos', 'Aumentos bruscos de carga'],
      evitar: ['Saltarse el calentamiento'],
      vigilar: ['Tendón rotuliano (muchos saltos)'],
    },
    post: {
      prioritzar: ['Fuerza de tipo adulto, supervisada', 'Potencia y pliometría', 'Velocidad y resistencia específica'],
      moderar: ['Carga total semanal'],
      evitar: ['Entrenar sin progresión'],
      vigilar: ['Tendón rotuliano', 'Tobillos (esguinces)'],
    },
  },
}
