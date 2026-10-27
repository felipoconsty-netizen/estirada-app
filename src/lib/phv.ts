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
  if (years <= 0.08) return null // menys d'un mes entre mesures dona velocitats poc fiables
  return (b.height - a.height) / years
}

/** Llindar de "creix ràpid" (cm/any). A l'acadèmia de l'Athletic, per sobre d'aquí les lesions de creixement es multipliquen per 2,5–2,8 (Monasterio et al., 2024). */
export const FAST_GROWTH = 7.2

// Khamis & Roche (1994): alçada adulta = B + a·alçada(in) + b·pes(lb) + c·alçada mitjana dels pares(in).
// Files: edat, nois [B, a, b, c], noies [B, a, b, c]. Els coeficients de pes són els publicats (×10 respecte als del paquet matuR).
const KR: [number, number[], number[]][] = [
  [4, [-10.2567, 1.23812, -0.087235, 0.50286], [-8.1325, 1.24768, -0.19435, 0.44774]],
  [4.5, [-10.719, 1.15964, -0.074454, 0.52887], [-6.47656, 1.22177, -0.18519, 0.41381]],
  [5, [-11.0213, 1.10674, -0.06478, 0.53919], [-5.13582, 1.19932, -0.1753, 0.38467]],
  [5.5, [-11.1556, 1.0748, -0.057760, 0.53691], [-4.13791, 1.1788, -0.16484, 0.36039]],
  [6, [-11.1138, 1.05923, -0.052947, 0.52513], [-3.51039, 1.15866, -0.154, 0.34105]],
  [6.5, [-11.0221, 1.05542, -0.049892, 0.50692], [-3.14322, 1.13737, -0.14294, 0.32672]],
  [7, [-10.9984, 1.05877, -0.048144, 0.48538], [-2.87645, 1.11342, -0.13184, 0.31748]],
  [7.5, [-11.0214, 1.06467, -0.047256, 0.46361], [-2.66291, 1.08525, -0.12086, 0.3134]],
  [8, [-11.0696, 1.06853, -0.046778, 0.44469], [-2.45559, 1.05135, -0.11019, 0.31457]],
  [8.5, [-11.122, 1.06572, -0.046255, 0.43171], [-2.20728, 1.01018, -0.09999, 0.32105]],
  [9, [-11.1571, 1.05166, -0.045254, 0.42776], [-1.87098, 0.9602, -0.09044, 0.33291]],
  [9.5, [-11.1405, 1.02174, -0.043311, 0.43593], [-1.0633, 0.89989, -0.08171, 0.35025]],
  [10, [-11.038, 0.97135, -0.039981, 0.45932], [0.33468, 0.82771, -0.07397, 0.37312]],
  [10.5, [-10.8286, 0.89589, -0.034814, 0.50101], [1.97366, 0.74213, -0.06739, 0.40161]],
  [11, [-10.4917, 0.81239, -0.029050, 0.54781], [3.50436, 0.67173, -0.06136, 0.42042]],
  [11.5, [-10.0065, 0.74134, -0.024167, 0.58409], [4.57747, 0.6415, -0.05518, 0.41686]],
  [12, [-9.3522, 0.68325, -0.020076, 0.60927], [4.84365, 0.64452, -0.04894, 0.3949]],
  [12.5, [-8.6055, 0.63869, -0.016681, 0.62279], [4.27869, 0.67386, -0.04272, 0.3585]],
  [13, [-7.8632, 0.60818, -0.013895, 0.62407], [3.21417, 0.7226, -0.03661, 0.31163]],
  [13.5, [-7.1348, 0.59228, -0.011618, 0.61253], [1.83456, 0.78383, -0.03067, 0.25826]],
  [14, [-6.4299, 0.59151, -0.009776, 0.58762], [0.32425, 0.85062, -0.025, 0.20235]],
  [14.5, [-5.7578, 0.60643, -0.008256, 0.54875], [-1.13224, 0.91605, -0.01967, 0.14787]],
  [15, [-5.1282, 0.63757, -0.006994, 0.49536], [-2.35055, 0.97319, -0.01477, 0.0988]],
  [15.5, [-4.5092, 0.68548, -0.005863, 0.42687], [-3.10326, 1.01514, -0.01037, 0.05909]],
  [16, [-3.9292, 0.75069, -0.004795, 0.34271], [-3.17885, 1.03496, -0.00655, 0.03272]],
  [16.5, [-3.4873, 0.83375, -0.003695, 0.24231], [-2.41657, 1.02573, -0.0034, 0.02364]],
  [17, [-3.283, 0.9352, -0.002470, 0.1251], [-0.65579, 0.98054, -0.001, 0.03584]],
  [17.5, [-3.4156, 1.05558, -0.001033, -0.0095], [2.26429, 0.89246, 0.00057, 0.07327]],
]

/** Alçada adulta prevista (cm) pel mètode Khamis-Roche, o null si falten els pares o l'edat és fora de 4–17,5 anys. */
export function predictAdultHeight(sex: Sex, age: number, height: number, mass: number, father: number, mother: number): number | null {
  if (!(father > 100 && mother > 100) || age < 4 || age > 17.75) return null
  const i = KR.findIndex(([a]) => a >= Math.min(age, 17.5))
  const k = (r: (typeof KR)[number]) => (sex === 'M' ? r[1] : r[2])
  const hi = k(KR[i]), lo = k(KR[Math.max(0, i - 1)])
  const w = i === 0 || age >= 17.5 ? 1 : (age - KR[i - 1][0]) / 0.5 // interpolació entre les dues mitges edats
  const c = hi.map((x, j) => lo[j] + (x - lo[j]) * w)
  const inches = c[0] + c[1] * (height / 2.54) + c[2] * (mass * 2.20462) + c[3] * ((father + mother) / 2 / 2.54)
  return Math.max(height, inches * 2.54)
}

export type PahBand = 'lluny' | 'acosta' | 'pic' | 'despres'
/** Franges de bio-banding pel % de l'alçada adulta (Cumming et al., 2017). */
export const pahBand = (pct: number): PahBand => (pct < 85 ? 'lluny' : pct < 90 ? 'acosta' : pct <= 95 ? 'pic' : 'despres')
export const PAH_BANDS: Record<PahBand, Record<Lang, string>> = {
  lluny: { ca: 'Lluny del pic (<85%)', es: 'Lejos del pico (<85%)' },
  acosta: { ca: "S'acosta al pic (85–90%)", es: 'Se acerca al pico (85–90%)' },
  pic: { ca: 'Al voltant del pic (90–95%)', es: 'Alrededor del pico (90–95%)' },
  despres: { ca: 'Després del pic (>95%)', es: 'Después del pico (>95%)' },
}

/** Trimestre de naixement (1–4). */
export const birthQuarter = (dob: string) => Math.floor((Number(dob.slice(5, 7)) - 1) / 3) + 1

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
