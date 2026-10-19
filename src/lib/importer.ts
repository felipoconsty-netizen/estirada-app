import type { Measure, Sex } from './phv'

type Cell = string | number | boolean | Date | null | undefined
export type Field = 'name' | 'surname' | 'sex' | 'dob' | 'father' | 'mother' | 'date' | 'height' | 'sitting' | 'mass'

export interface ImportRow {
  name: string
  sex: Sex | null
  dob: string | null
  father: number | null
  mother: number | null
  measures: Measure[]
  problems: ('dob' | 'sex' | 'measure')[]
}

/** Llegeix totes les pestanyes d'un .xlsx (o un .csv com una sola pestanya). */
export async function readTables(file: File): Promise<Cell[][][]> {
  if (/\.(csv|txt)$/i.test(file.name)) return [parseCsv(await file.text())]
  if (/\.xls$/i.test(file.name)) throw new Error('xls')
  const { default: readXlsx } = await import('read-excel-file/browser')
  const sheets = (await readXlsx(file)) as unknown as { data: Cell[][] }[]
  return sheets.map((x) => x.data)
}

export function parseCsv(text: string): Cell[][] {
  text = text.replace(/^﻿/, '')
  const first = text.split(/\r?\n/, 1)[0]
  const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0]
  const rows: Cell[][] = []
  let row: string[] = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Endevina què és cada columna pel títol (català, castellà o anglès). */
export function guessField(header: unknown): Field | null {
  const h = norm(header)
  if (!h || h.length > 40) return null
  if (/^(sexe|sexo|genere|genero|sex|gender)\b/.test(h)) return 'sex'
  // Columnes calculades o auxiliars que no són dades de partida.
  if (/diana|prevista|adulta|inicial|guanyat|restant|predic|target|bench|banc|velocitat|velocity|offset|phv|mitjana|media|\b(edat|edad|age)\b|\b\d\b/.test(h)) return null
  if (/assegu|sentad|sitting|tronc/.test(h)) return 'sitting'
  if (/\b(pare|padre|father|dad)\b/.test(h)) return 'father'
  if (/\b(mare|madre|mother|mum|mom)\b/.test(h)) return 'mother'
  if (/naix|nacim|birth|dob|neix|nacid/.test(h)) return 'dob'
  if (/\b(nom|nombre|name)\b/.test(h) && /cognom|apellid|complet|full/.test(h)) return 'name'
  if (/cognom|apellid|surname|last name/.test(h)) return 'surname'
  if (/\b(sexe|sexo|genere|genero|sex|gender)\b/.test(h)) return 'sex'
  if (/\b(pes|peso|weight|massa|mass|kg)\b/.test(h)) return 'mass'
  if (/alcada|altura|talla|estatura|height/.test(h)) return 'height'
  if (/\b(data|fecha|date|dia)\b/.test(h) && !/primera|ultima|ultim/.test(h)) return 'date'
  if (/\b(nom|nombre|name|jugador|jugadora|jugadores|jugadoras|player|alumne|deportista)\b/.test(h)) return 'name'
  return null
}

interface Table { map: (Field | null)[]; rows: Cell[][] }

/** Una fila és de títols si té una columna de nom i almenys una altra columna coneguda. */
function headerMap(row: Cell[]): (Field | null)[] | null {
  const seen = new Set<Field>()
  const map = row.map((c) => { const f = guessField(c); return f && !seen.has(f) ? (seen.add(f), f) : null })
  return map.includes('name') && map.filter(Boolean).length >= 2 ? map : null
}

/** Separa cada pestanya en taules: cada fila de títols n'obre una de nova. */
export function findTables(sheet: Cell[][]): Table[] {
  const out: Table[] = []
  for (const row of sheet) {
    const map = headerMap(row)
    if (map) out.push({ map, rows: [] })
    else if (out.length) out[out.length - 1].rows.push(row)
  }
  return out
}

type Partial = { date: string | null; height?: number; sitting?: number; mass?: number }

/** Converteix un llibre sencer (totes les pestanyes) en jugadors/es, ajuntant les dades de cada full pel nom. */
export function sheetsToPlayers(sheets: Cell[][][], today: string): ImportRow[] | null {
  const tables = sheets.flatMap(findTables)
  if (!tables.length) return null
  // Si alguna taula té data de naixement, només aquestes decideixen qui és jugador/a (així no es colen notes ni llegendes).
  const hasDob = tables.some((t) => t.map.includes('dob'))
  const anchors = tables.filter((t) => (hasDob ? t.map.includes('dob') : t.map.includes('height') || t.map.includes('sitting') || t.map.includes('mass')))
  const players = new Map<string, ImportRow & { parts: Partial[] }>()
  const nameOf = (t: Table, r: Cell[]) => {
    const g = (f: Field) => { const i = t.map.indexOf(f); return i >= 0 ? String(r[i] ?? '').trim() : '' }
    return [g('name'), g('surname')].filter(Boolean).join(' ').replace(/\s+/g, ' ')
  }
  for (const t of anchors) for (const r of t.rows) {
    const name = nameOf(t, r)
    const at = (f: Field) => { const i = t.map.indexOf(f); return i >= 0 ? r[i] : null }
    // Una fila de jugador/a té un nom curt i alguna dada (data de naixement o una mesura); així es descarten notes i avisos.
    const data = toISODate(at('dob')) || (['height', 'sitting', 'mass'] as Field[]).some((f) => toNumber(at(f)) != null)
    if (name && name.length <= 60 && data && !players.has(norm(name))) players.set(norm(name), { name, sex: null, dob: null, father: null, mother: null, measures: [], problems: [], parts: [] })
  }
  for (const t of tables) {
    const get = (r: Cell[], f: Field) => { const i = t.map.indexOf(f); return i >= 0 ? r[i] : null }
    for (const r of t.rows) {
      const p = players.get(norm(nameOf(t, r)))
      if (!p) continue
      p.sex ??= toSex(get(r, 'sex'))
      p.dob ??= toISODate(get(r, 'dob'))
      const fa = toNumber(get(r, 'father')), mo = toNumber(get(r, 'mother'))
      if (fa && fa > 130 && fa < 230) p.father ??= fa
      if (mo && mo > 130 && mo < 230) p.mother ??= mo
      const h = toNumber(get(r, 'height')), si = toNumber(get(r, 'sitting')), w = toNumber(get(r, 'mass'))
      if (h != null || si != null || w != null) p.parts.push({ date: toISODate(get(r, 'date')), height: h ?? undefined, sitting: si ?? undefined, mass: w ?? undefined })
    }
  }
  return [...players.values()].map(({ parts, ...p }) => {
    // Ajunta les mesures del mateix dia (p. ex. alçada en un full i alçada asseguda en un altre).
    const byDate = new Map<string, Partial>()
    for (const x of parts.filter((x) => x.date)) {
      const m = byDate.get(x.date!) ?? { date: x.date }
      m.height ??= x.height; m.sitting ??= x.sitting; m.mass ??= x.mass
      byDate.set(x.date!, m)
    }
    // Les dades sense data completen l'última mesura compatible (o, si no n'hi ha cap, són d'avui).
    for (const x of parts.filter((x) => !x.date)) {
      const last = [...byDate.values()].sort((a, b) => b.date!.localeCompare(a.date!))[0]
      const same = (a?: number, b?: number) => a == null || b == null || Math.abs(a - b) < 0.6
      if (last && same(last.height, x.height) && same(last.mass, x.mass) && same(last.sitting, x.sitting)) { last.height ??= x.height; last.sitting ??= x.sitting; last.mass ??= x.mass }
      else if (!last) byDate.set(today, { ...x, date: today })
    }
    for (const m of byDate.values()) {
      const { height: h, sitting: s, mass: w } = m
      const ok = h != null && s != null && w != null && h >= 80 && h <= 240 && s >= 40 && s <= 140 && w >= 15 && w <= 180 && s < h && m.date! <= today
      if (ok) p.measures.push({ date: m.date!, height: h!, sitting: s!, mass: w! })
      else if (!p.problems.includes('measure')) p.problems.push('measure')
    }
    p.measures.sort((a, b) => a.date.localeCompare(b.date))
    if (!p.dob || p.dob > today || +p.dob.slice(0, 4) < +today.slice(0, 4) - 22) { p.dob = null; p.problems.unshift('dob') }
    return p
  })
}

export function toNumber(v: Cell): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Accepta dates d'Excel, 14/02/2013, 14-2-13, 2013-02-14… Retorna ISO o null. */
export function toISODate(v: Cell): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return isNaN(+v) ? null : `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  if (typeof v === 'number' && v > 3000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return toISODate(d) }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return valid(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) { let y = +m[3]; if (y < 100) y += y > 50 ? 1900 : 2000; return valid(y, +m[2], +m[1]) }
  return null
}
function valid(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : null
}

export function toSex(v: Cell): Sex | null {
  const s = norm(v)
  if (!s) return null
  if (s === '2') return 'F'
  if (s === '1') return 'M'
  if (/^(f|fem|femeni|femenino|female|noia|chica|nena|nina|dona|mujer|girl|w)/.test(s)) return 'F'
  if (/^(m|h|masc|masculi|masculino|male|noi|chico|nen|nino|home|hombre|boy|v|var)/.test(s)) return 'M'
  return null
}

export const normName = norm
