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

/** Llegeix un .xlsx (primera pestanya) o un .csv i en retorna les files. */
export async function readTable(file: File): Promise<Cell[][]> {
  if (/\.(csv|txt)$/i.test(file.name)) return parseCsv(await file.text())
  if (/\.xls$/i.test(file.name)) throw new Error('xls')
  const { readSheet } = await import('read-excel-file/browser')
  return (await readSheet(file)) as Cell[][]
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
  if (!h) return null
  if (/assegu|sentad|sitting|tronc/.test(h)) return 'sitting'
  if (/\b(pare|padre|father|dad)\b/.test(h)) return 'father'
  if (/\b(mare|madre|mother|mum|mom)\b/.test(h)) return 'mother'
  if (/naix|nacim|birth|dob|neix|nacid/.test(h)) return 'dob'
  if (/cognom|apellid|surname|last name/.test(h)) return 'surname'
  if (/\b(sexe|sexo|genere|genero|sex|gender)\b/.test(h)) return 'sex'
  if (/\b(pes|peso|weight|massa|mass|kg)\b/.test(h)) return 'mass'
  if (/alcada|altura|talla|estatura|height/.test(h)) return 'height'
  if (/\b(data|fecha|date|dia)\b/.test(h)) return 'date'
  if (/\b(nom|nombre|name|jugador|jugadora|jugadores|jugadoras|player|alumne|deportista)\b/.test(h)) return 'name'
  return null
}

/** Busca la fila de títols (una de les 10 primeres amb una columna de nom). */
export function findHeader(rows: Cell[][]): { at: number; map: (Field | null)[] } | null {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const map = rows[i].map(guessField)
    if (map.includes('name')) {
      // Una sola columna per camp: si es repeteix, ens quedem amb la primera.
      const seen = new Set<Field>()
      return { at: i, map: map.map((f) => (f && !seen.has(f) ? (seen.add(f), f) : null)) }
    }
  }
  return null
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
  if (/^(f|fem|femeni|femenino|female|noia|chica|nena|nina|dona|mujer|girl|w)/.test(s)) return 'F'
  if (/^(m|h|masc|masculi|masculino|male|noi|chico|nen|nino|home|hombre|boy|v|var)/.test(s)) return 'M'
  return null
}

/** Converteix les files en jugadores. Una jugadora pot tenir diverses files (una per mesura). */
export function rowsToPlayers(rows: Cell[][], today: string): ImportRow[] | null {
  const head = findHeader(rows)
  if (!head) return null
  const col = (f: Field) => head.map.indexOf(f)
  const get = (r: Cell[], f: Field) => (col(f) >= 0 ? r[col(f)] : null)
  const out = new Map<string, ImportRow>()
  for (const r of rows.slice(head.at + 1)) {
    const name = [get(r, 'name'), get(r, 'surname')].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ')
    if (!name) continue
    const key = norm(name)
    const p = out.get(key) ?? { name, sex: null, dob: null, father: null, mother: null, measures: [], problems: [] }
    p.sex ??= toSex(get(r, 'sex'))
    p.dob ??= toISODate(get(r, 'dob'))
    const fa = toNumber(get(r, 'father')), mo = toNumber(get(r, 'mother'))
    if (fa && fa > 130 && fa < 230) p.father ??= fa
    if (mo && mo > 130 && mo < 230) p.mother ??= mo
    const h = toNumber(get(r, 'height')), s = toNumber(get(r, 'sitting')), w = toNumber(get(r, 'mass'))
    if (h != null || s != null || w != null) {
      const ok = h != null && s != null && w != null && h >= 80 && h <= 240 && s >= 40 && s <= 140 && w >= 15 && w <= 180 && s < h
      const date = toISODate(get(r, 'date')) ?? today
      if (ok && date <= today) p.measures = [...p.measures.filter((m) => m.date !== date), { date, height: h!, sitting: s!, mass: w! }]
      else if (!p.problems.includes('measure')) p.problems.push('measure')
    }
    out.set(key, p)
  }
  for (const p of out.values()) {
    p.measures.sort((a, b) => a.date.localeCompare(b.date))
    if (!p.dob || p.dob > today || +p.dob.slice(0, 4) < +today.slice(0, 4) - 22) { p.dob = null; p.problems.unshift('dob') }
  }
  return [...out.values()]
}

export const normName = norm
