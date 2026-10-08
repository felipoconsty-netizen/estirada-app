import { useState } from 'react'
import type { PlayerView } from '@/lib/derive'
import { firstName, fmt, signed } from '@/lib/derive'
import type { Measure } from '@/lib/phv'

const LV = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' } as const

/** Petita línia de benestar (1–5) de les últimes setmanes. Un sol color: el valor, no la identitat. */
export function Sparkline({ values, painWeeks }: { values: number[]; painWeeks: boolean[] }) {
  const w = 104, h = 28, pad = 4
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1)
  const y = (v: number) => h - pad - ((v - 1) / 4) * (h - pad * 2)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]
  const prev = values.slice(-5, -1).reduce((a, b) => a + b, 0) / 4
  const color = last <= prev - 0.8 ? 'var(--warn)' : 'var(--accent)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Benestar actual ${fmt(last)} de 5`}>
      <line x1={pad} x2={w - pad} y1={y(3)} y2={y(3)} stroke="var(--line)" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {painWeeks.map((p, i) => p && <circle key={i} cx={x(i)} cy={h - 2} r={1.8} fill="var(--bad)" />)}
      <circle cx={x(values.length - 1)} cy={y(last)} r={3} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  )
}

/** Barra d'una sola jugadora sobre l'eix de maduració, amb la franja del pic marcada. */
export function OffsetGauge({ offset, labels }: { offset: number; labels: { before: string; peak: string; after: string } }) {
  const min = -3, max = 3, w = 1000, h = 56
  const sx = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * w
  const ticks = [-3, -2, -1, 0, 1, 2, 3]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Maturity offset ${signed(offset)} anys`}>
      <rect x={0} y={18} width={w} height={10} rx={5} fill="var(--surface-2)" />
      <rect x={sx(-1)} y={18} width={sx(-0.5) - sx(-1)} height={10} fill="var(--warn-soft)" />
      <rect x={sx(0.5)} y={18} width={sx(1) - sx(0.5)} height={10} fill="var(--warn-soft)" />
      <rect x={sx(-0.5)} y={18} width={sx(0.5) - sx(-0.5)} height={10} fill="var(--bad-soft)" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={30} y2={34} stroke="var(--faint)" />
          <text x={Math.min(w - 8, Math.max(8, sx(t)))} y={48} textAnchor="middle" fontSize={12} fill="var(--muted)" fontFamily="var(--mono)">{t > 0 ? `+${t}` : t}</text>
        </g>
      ))}
      <text x={4} y={11} fontSize={12} fill="var(--muted)">{labels.before}</text>
      <text x={sx(0)} y={11} fontSize={12} fill="var(--bad)" textAnchor="middle" fontWeight={600}>{labels.peak}</text>
      <text x={w - 4} y={11} fontSize={12} fill="var(--muted)" textAnchor="end">{labels.after}</text>
      <circle cx={sx(offset)} cy={23} r={9} fill="var(--fg)" stroke="var(--surface)" strokeWidth={3} />
    </svg>
  )
}

/** Mapa de maduració de l'equip: cada punt és un jugador; files per evitar que s'encavalquin. */
export function MaturityMap({ views, onPick, labels }: { views: PlayerView[]; onPick: (id: string) => void; labels: { before: string; peak: string; after: string } }) {
  const [hover, setHover] = useState<string | null>(null)
  const min = -2.5, max = 2.5, w = 760, padX = 24
  const sx = (v: number) => padX + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (w - padX * 2)
  const sorted = [...views].sort((a, b) => a.offset - b.offset)
  const rows: number[] = []
  const placed = sorted.map((v) => {
    const x = sx(v.offset)
    let r = 0
    while (rows[r] !== undefined && x - rows[r] < 92) r++
    rows[r] = x
    return { v, x, r }
  })
  const rowH = 26, top = 30
  const h = top + Math.max(rows.length, 3) * rowH + 30
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[620px]" role="img" aria-label="Mapa de maduració de l'equip">
        <rect x={sx(-0.5)} y={top - 8} width={sx(0.5) - sx(-0.5)} height={h - top - 22} fill="var(--bad-soft)" rx={6} />
        <rect x={sx(-1)} y={top - 8} width={sx(-0.5) - sx(-1)} height={h - top - 22} fill="var(--warn-soft)" opacity={0.7} />
        <rect x={sx(0.5)} y={top - 8} width={sx(1) - sx(0.5)} height={h - top - 22} fill="var(--warn-soft)" opacity={0.7} />
        <text x={padX} y={14} fontSize={12} fill="var(--muted)">← {labels.before}</text>
        <text x={sx(0)} y={14} fontSize={12} fill="var(--bad)" fontWeight={600} textAnchor="middle">{labels.peak}</text>
        <text x={w - padX} y={14} fontSize={12} fill="var(--muted)" textAnchor="end">{labels.after} →</text>
        <line x1={padX} x2={w - padX} y1={h - 22} y2={h - 22} stroke="var(--line)" />
        {[-2, -1, 0, 1, 2].map((t) => (
          <text key={t} x={sx(t)} y={h - 6} fontSize={12} textAnchor="middle" fill="var(--muted)" fontFamily="var(--mono)">{t > 0 ? `+${t}` : t}</text>
        ))}
        {placed.map(({ v, x, r }) => {
          const y = top + r * rowH + 6
          const active = hover === v.p.id
          return (
            <g key={v.p.id} onMouseEnter={() => setHover(v.p.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(v.p.id)} style={{ cursor: 'pointer' }}>
              <rect x={x - 46} y={y - 12} width={92} height={24} fill="transparent" />
              <circle cx={x} cy={y} r={active ? 7 : 6} fill={LV[v.level]} stroke="var(--surface)" strokeWidth={2} />
              <text x={x + 10} y={y + 4} fontSize={12.5} fill="var(--fg)" fontWeight={active ? 600 : 400}>{firstName(v.p.name)}</text>
              {active && (
                <g>
                  <rect x={Math.min(x - 10, w - 190)} y={y + 12} width={180} height={26} rx={6} fill="var(--fg)" />
                  <text x={Math.min(x - 10, w - 190) + 10} y={y + 29} fontSize={12} fill="var(--bg)" fontFamily="var(--mono)">{signed(v.offset)} · {fmt(v.age)} · {fmt(v.height, 0)} cm</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Alçada a cada mesura amb l'alçada adulta prevista com a referència. */
export function GrowthChart({ measures, target, unit }: { measures: Measure[]; target: number; unit: string }) {
  const w = 420, h = 200, l = 44, r = 16, t = 16, b = 30
  const hs = measures.map((m) => m.height)
  const lo = Math.floor((Math.min(...hs) - 4) / 5) * 5
  const hi = Math.ceil((Math.max(target, ...hs) + 2) / 5) * 5
  const t0 = new Date(measures[0].date).getTime()
  const t1 = new Date(measures[measures.length - 1].date).getTime()
  const sx = (d: string) => l + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (w - l - r)
  const sy = (v: number) => t + (1 - (v - lo) / (hi - lo)) * (h - t - b)
  const ticks: number[] = []
  for (let v = lo; v <= hi; v += 5) ticks.push(v)
  const [hover, setHover] = useState<number | null>(null)
  const months = ['gen', 'feb', 'mar', 'abr', 'maig', 'juny', 'jul', 'ag', 'set', 'oct', 'nov', 'des']
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Alçada a cada mesura">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={l} x2={w - r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={l - 8} y={sy(v) + 4} fontSize={11} textAnchor="end" fill="var(--muted)" fontFamily="var(--mono)">{v}</text>
        </g>
      ))}
      <line x1={l} x2={w - r} y1={sy(target)} y2={sy(target)} stroke="var(--accent)" strokeDasharray="5 4" strokeWidth={1.5} />
      <text x={w - r} y={sy(target) - 6} fontSize={11} textAnchor="end" fill="var(--accent)">{fmt(target, 0)} {unit}</text>
      <path d={measures.map((m, i) => `${i ? 'L' : 'M'}${sx(m.date)},${sy(m.height)}`).join(' ')} fill="none" stroke="var(--fg)" strokeWidth={2} />
      {measures.map((m, i) => (
        <g key={m.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <circle cx={sx(m.date)} cy={sy(m.height)} r={14} fill="transparent" />
          <circle cx={sx(m.date)} cy={sy(m.height)} r={5} fill="var(--fg)" stroke="var(--surface)" strokeWidth={2} />
          <text x={sx(m.date)} y={h - 10} fontSize={11} textAnchor="middle" fill="var(--muted)">{months[new Date(m.date).getMonth()]}</text>
          {(hover === i || i === measures.length - 1) && (
            <text x={sx(m.date) + (i === measures.length - 1 ? -10 : 10)} y={sy(m.height) - 10} fontSize={12} fontWeight={600} textAnchor={i === measures.length - 1 ? 'end' : 'start'} fill="var(--fg)" fontFamily="var(--mono)">{fmt(m.height)}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

/** Benestar mitjà setmanal (1–5) amb les setmanes amb dolor marcades a sota. */
export function WellnessChart({ values, weeks, pain, painLabel }: { values: number[]; weeks: string[]; pain: (number | null)[]; painLabel: string }) {
  const w = 420, h = 200, l = 30, r = 16, t = 14, b = 44
  const sx = (i: number) => l + (i * (w - l - r)) / (values.length - 1)
  const sy = (v: number) => t + (1 - (v - 1) / 4) * (h - t - b)
  const [hover, setHover] = useState<number | null>(null)
  const area = `M${sx(0)},${sy(1)} ` + values.map((v, i) => `L${sx(i)},${sy(v)}`).join(' ') + ` L${sx(values.length - 1)},${sy(1)} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Benestar setmanal">
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={l} x2={w - r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" />
          <text x={l - 8} y={sy(v) + 4} fontSize={11} textAnchor="end" fill="var(--muted)" fontFamily="var(--mono)">{v}</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.12} />
      <path d={values.map((v, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={sx(i) - 20} y={t} width={40} height={h - t - b + 30} fill="transparent" />
          {hover === i && <line x1={sx(i)} x2={sx(i)} y1={t} y2={sy(1)} stroke="var(--faint)" strokeDasharray="2 3" />}
          <circle cx={sx(i)} cy={sy(v)} r={i === values.length - 1 || hover === i ? 4.5 : 3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
          {hover === i && <text x={Math.min(sx(i), w - r - 4)} y={sy(v) - 10} fontSize={12} fontWeight={600} textAnchor={i === values.length - 1 ? 'end' : 'middle'} fill="var(--fg)" fontFamily="var(--mono)">{fmt(v)}{pain[i] !== null ? ` · ${painLabel} ${pain[i]}/10` : ''}</text>}
          {pain[i] !== null && <rect x={sx(i) - 5} y={h - b + 8} width={10} height={10} rx={2} fill="var(--bad)" />}
          <text x={sx(i)} y={h - 8} fontSize={10.5} textAnchor="middle" fill="var(--muted)" fontFamily="var(--mono)">{weeks[i]}</text>
        </g>
      ))}
    </svg>
  )
}
