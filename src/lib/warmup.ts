// Escalfament de prevenció (15 minuts), basat en l'estructura de FIFA 11+ i PEP adaptada al bàsquet.
// El que protegeix és fer-lo sovint: el grup que el fa més de la meitat de les sessions té fins a un 88% menys de lesions de creuat.
import type { Lang } from './phv'
import { daysBetween } from './load'

export type Part = 1 | 2 | 3
export interface Exercise {
  part: Part
  name: Record<Lang, string>
  dose: [string, string, string] // nivells 1, 2 i 3
  cue: Record<Lang, string>
  jumps?: boolean // en plena estirada, sempre al nivell 1
  video: string // cerca a YouTube
}

export const PARTS: Record<Part, Record<Lang, string>> = {
  1: { ca: '1. Carrera i mobilitat (4 min)', es: '1. Carrera y movilidad (4 min)' },
  2: { ca: '2. Força i equilibri (7 min)', es: '2. Fuerza y equilibrio (7 min)' },
  3: { ca: '3. Aterratges i canvis de direcció (4 min)', es: '3. Aterrizajes y cambios de dirección (4 min)' },
}

export const PROGRAM: Exercise[] = [
  { part: 1, name: { ca: 'Carrera amb obertura i tancament de maluc', es: 'Carrera con apertura y cierre de cadera' }, dose: ['2 pistes', '2 pistes', '2 pistes'],
    cue: { ca: 'Genoll amunt i cap enfora, i després cap endins. Esquena recta.', es: 'Rodilla arriba y hacia fuera, luego hacia dentro. Espalda recta.' }, video: 'FIFA 11+ running hip out hip in' },
  { part: 1, name: { ca: 'Desplaçament defensiu lateral', es: 'Desplazamiento defensivo lateral' }, dose: ['2 × amplada', '2 × amplada', '3 × amplada'],
    cue: { ca: 'Cames flexionades, genolls alineats amb els peus, sense creuar els peus.', es: 'Piernas flexionadas, rodillas alineadas con los pies, sin cruzar los pies.' }, video: 'basketball defensive slide drill technique' },
  { part: 1, name: { ca: 'Carrera amb canvis de direcció suaus', es: 'Carrera con cambios de dirección suaves' }, dose: ['2 pistes', '2 pistes', '2 pistes'],
    cue: { ca: 'Frena en dos temps i canvia de direcció amb el genoll sobre el peu.', es: 'Frena en dos tiempos y cambia de dirección con la rodilla sobre el pie.' }, video: 'FIFA 11+ running shoulder contact cutting' },
  { part: 2, name: { ca: 'Planxa frontal', es: 'Plancha frontal' }, dose: ['3 × 20 s', '3 × 30 s, alternant cames', '3 × 30 s, una cama enlaire'],
    cue: { ca: 'Cos en línia recta, sense enfonsar l’esquena.', es: 'Cuerpo en línea recta, sin hundir la espalda.' }, video: 'FIFA 11+ the bench plank' },
  { part: 2, name: { ca: 'Planxa lateral', es: 'Plancha lateral' }, dose: ['2 × 20 s per costat', '2 × 30 s, aixecant maluc', '2 × 30 s, cama de dalt enlaire'],
    cue: { ca: 'Maluc amunt, espatlla sobre el colze.', es: 'Cadera arriba, hombro sobre el codo.' }, video: 'FIFA 11+ sideways bench' },
  { part: 2, name: { ca: 'Isquiotibials nòrdics (amb parella)', es: 'Isquiotibiales nórdicos (con pareja)' }, dose: ['3–5 repeticions', '7–10 repeticions', '12–15 repeticions'],
    cue: { ca: 'Baixa a poc a poc amb el cos recte. Para’t amb les mans.', es: 'Baja despacio con el cuerpo recto. Párate con las manos.' }, video: 'FIFA 11+ nordic hamstrings' },
  { part: 2, name: { ca: 'Equilibri a una cama amb passades', es: 'Equilibrio a una pierna con pases' }, dose: ['30 s per cama', '2 × 30 s per cama', '2 × 30 s, sobre superfície tova'],
    cue: { ca: 'Genoll lleugerament flexionat i alineat. Passa la pilota sense perdre l’equilibri.', es: 'Rodilla ligeramente flexionada y alineada. Pasa el balón sin perder el equilibrio.' }, video: 'FIFA 11+ single leg stance throwing ball with partner' },
  { part: 2, name: { ca: 'Esquats amb bona alineació', es: 'Sentadillas con buena alineación' }, dose: ['2 × 10', '2 × 10, sobre puntes al final', '2 × 10 a una cama'],
    cue: { ca: 'Genolls sobre els peus, mai cap endins. Maluc enrere com per seure.', es: 'Rodillas sobre los pies, nunca hacia dentro. Cadera atrás como para sentarse.' }, video: 'FIFA 11+ squats knee alignment' },
  { part: 3, name: { ca: 'Salts verticals amb aterratge suau', es: 'Saltos verticales con aterrizaje suave' }, dose: ['2 × 5', '2 × 8', '2 × 10'],
    cue: { ca: 'Aterra amb tots dos peus, genolls flexionats i alineats, sense soroll.', es: 'Aterriza con los dos pies, rodillas flexionadas y alineadas, sin ruido.' }, jumps: true, video: 'FIFA 11+ jumping vertical jumps landing' },
  { part: 3, name: { ca: 'Salts laterals a una cama', es: 'Saltos laterales a una pierna' }, dose: ['2 × 5 per cama, curts', '2 × 8 per cama', '2 × 10 per cama, més lluny'],
    cue: { ca: 'Aguanta l’aterratge 2 segons amb el genoll sobre el peu.', es: 'Aguanta el aterrizaje 2 segundos con la rodilla sobre el pie.' }, jumps: true, video: 'FIFA 11+ lateral jumps single leg' },
  { part: 3, name: { ca: 'Arrencada, frenada i tall', es: 'Arrancada, frenada y corte' }, dose: ['3 × mitja pista', '4 × mitja pista', '4 × mitja pista, més ràpid'],
    cue: { ca: 'Frena baixant el centre de gravetat i talla amb el genoll alineat.', es: 'Frena bajando el centro de gravedad y corta con la rodilla alineada.' }, video: 'FIFA 11+ plant and cut' },
]

export const videoUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

/** Objectiu: 2 escalfaments per setmana o més. */
export const WARMUP_GOAL = 2

/** Escalfaments de cada bloc de 7 dies (de més antic a avui) i la mitjana setmanal de les últimes 4 setmanes. */
export function warmupStats(dates: string[], today: string, n = 4) {
  const weeks = Array.from({ length: n }, (_, i) => {
    const from = (n - 1 - i) * 7
    return dates.filter((d) => { const x = daysBetween(d, today); return x >= from && x < from + 7 }).length
  })
  const avg = weeks.reduce((a, b) => a + b, 0) / n
  const level: 'ok' | 'warn' | 'bad' = avg >= WARMUP_GOAL ? 'ok' : avg >= 1 ? 'warn' : 'bad'
  return { weeks, avg, last: weeks[n - 1], level, any: dates.length > 0 }
}

/** Línia del resum de dilluns sobre l'escalfament. Null si encara no se n'ha apuntat cap. */
export function warmupLine(dates: string[] | undefined, today: string, lang: Lang): { level: 'ok' | 'warn' | 'bad'; text: string } | null {
  if (!dates?.length) return null
  const s = warmupStats(dates, today)
  const es = lang === 'es'
  const avg = s.avg.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  if (s.level === 'ok') return { level: 'ok', text: es ? `Calentamiento de prevención: ${avg} por semana de media. Buen ritmo, es lo que protege.` : `Escalfament de prevenció: ${avg} per setmana de mitjana. Bon ritme, és el que protegeix.` }
  return { level: 'warn', text: es
    ? `Calentamiento de prevención: solo ${avg} por semana de media. Para que proteja hacen falta ${WARMUP_GOAL} o más.`
    : `Escalfament de prevenció: només ${avg} per setmana de mitjana. Perquè protegeixi en calen ${WARMUP_GOAL} o més.` }
}
