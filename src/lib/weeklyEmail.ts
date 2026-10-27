// Correu del resum de dilluns. Es compila per a la funció de Supabase (npm run build:email).
import type { Team } from './data'
import { deriveTeam, mondaySummary, type Level } from './derive'
import { loadView } from './load'
import { warmupLine } from './warmup'
import { conclusions, mondayLabel, surveyWeeks } from './survey'

const COLOR: Record<Level, string> = { bad: '#b3261e', warn: '#a8640a', ok: '#1d7a4a', info: '#1f5fbf' }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const item = (level: Level, text: string) =>
  `<tr><td style="width:14px;vertical-align:top;padding:7px 0 0"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLOR[level]}"></span></td><td style="padding:3px 0 3px 6px;font-size:15px;line-height:1.45">${esc(text)}</td></tr>`

/** Resum de dilluns d'un entrenador/a: avisos de cada equip i conclusions del qüestionari. Null si no hi ha cap jugadora. */
export function weeklyEmail(teams: Team[], coach: string, appUrl: string, today: string): { subject: string; html: string; text: string } | null {
  const week = mondayLabel(today)
  const blocks: { team: Team; summary: { level: Level; text: string }[]; notes: { level: Level; text: string }[]; answered: number; sessions: number }[] = []
  for (const team of teams) {
    if (!team.players.length) continue
    const views = deriveTeam(team, 'ca', today)
    const weeks = surveyWeeks(team.players, week)
    const notes = conclusions(team.players, weeks, week, 'ca').filter((c) => c.level === 'bad' || c.level === 'warn').slice(0, 8)
    const answered = team.players.filter((p) => p.wellness.some((w) => w.week === week)).length
    const sessions = team.players.reduce((a, p) => a + loadView(p.loads, today).sessions, 0)
    const wl = warmupLine(team.warmups, today, 'ca')
    blocks.push({ team, summary: [...mondaySummary(views, 'ca'), ...(wl ? [wl] : [])], notes, answered, sessions })
  }
  if (!blocks.length) return null

  const alerts = blocks.reduce((a, b) => a + b.summary.filter((s) => s.level === 'bad' || s.level === 'warn').length, 0)
  const subject = alerts ? `Estirada · Resum de dilluns: ${alerts} ${alerts === 1 ? 'avís' : 'avisos'}` : 'Estirada · Resum de dilluns: setmana tranquil·la'
  const html = `<!doctype html><html lang="ca"><body style="margin:0;background:#f3f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15202b">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 4px;font-size:13px;color:#586572">Setmana del ${esc(week)}</p>
<h1 style="margin:0 0 16px;font-size:24px">Bon dia${coach ? `, ${esc(coach.split(' ')[0])}` : ''}</h1>
${blocks.map((b) => `<div style="background:#fff;border-radius:12px;padding:18px 20px;margin:0 0 14px">
<h2 style="margin:0 0 2px;font-size:19px">${esc(b.team.name)}</h2>
<p style="margin:0 0 10px;font-size:13px;color:#586572">Qüestionaris: ${b.answered}/${b.team.players.length}${b.sessions ? ` · ${b.sessions} esforços apuntats aquesta setmana` : ''}</p>
<table role="presentation" style="border-collapse:collapse;width:100%">${b.summary.map((s) => item(s.level, s.text)).join('')}</table>
${b.notes.length ? `<h3 style="margin:14px 0 4px;font-size:15px">Del qüestionari</h3><table role="presentation" style="border-collapse:collapse;width:100%">${b.notes.map((s) => item(s.level, s.text)).join('')}</table>` : ''}
</div>`).join('')}
<p style="margin:18px 0"><a href="${esc(appUrl)}" style="display:inline-block;background:#15202b;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600">Obre Estirada</a></p>
<p style="font-size:12px;color:#586572;line-height:1.5">Orientació per a l’entrenament, no és un diagnòstic mèdic. Pots deixar de rebre aquest correu des del teu perfil a l’app.</p>
</div></body></html>`
  const text = blocks.map((b) => [`${b.team.name}`, ...b.summary.map((s) => `- ${s.text}`), ...b.notes.map((s) => `- ${s.text}`)].join('\n')).join('\n\n') + `\n\n${appUrl}`
  return { subject, html, text }
}
