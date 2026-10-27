// Correu del resum de dilluns. El crida pg_cron cada dilluns al matí (vegeu supabase/cron.sql).
// Secrets: CRON_SECRET, RESEND_API_KEY, APP_URL i, opcional, EMAIL_FROM.
// lib.js es genera amb `npm run build:email` a partir de src/lib.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { assembleTeams, weeklyEmail } from './lib.js'

const env = (k: string) => Deno.env.get(k) ?? ''
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401)
  const dry = new URL(req.url).searchParams.has('dry') // ?dry: no envia res, retorna el que enviaria
  if (!dry && !env('RESEND_API_KEY')) return json({ error: 'RESEND_API_KEY missing' }, 500)

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
  const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const rows = <T,>(r: { data: T[] | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data ?? [] }

  const profiles = rows(await sb.from('profiles').select('id, coach_name, weekly_email').eq('weekly_email', true))
  const out: { owner: string; to?: string; subject?: string; status: string }[] = []
  for (const pr of profiles as { id: string; coach_name: string }[]) {
    try {
      const owner = pr.id
      const [teams, players, measures, wellness, injuries, loads] = await Promise.all([
        sb.from('teams').select('*').eq('owner', owner).order('created_at'),
        sb.from('players').select('*').eq('owner', owner).order('name'),
        sb.from('measures').select('*').eq('owner', owner).order('date'),
        sb.from('wellness').select('*').eq('owner', owner).gte('week', since(70)).order('week'),
        sb.from('injuries').select('*').eq('owner', owner).order('date', { ascending: false }),
        sb.from('loads').select('*').eq('owner', owner).gte('date', since(70)).order('date'),
      ]).then((rs) => rs.map(rows) as Record<string, unknown>[][])
      const mail = weeklyEmail(assembleTeams({ teams, players, measures, wellness, injuries, loads }), pr.coach_name, env('APP_URL'), today)
      if (!mail) { out.push({ owner, status: 'no players' }); continue }
      const { data: u } = await sb.auth.admin.getUserById(owner)
      const to = u.user?.email
      if (!to) { out.push({ owner, status: 'no email' }); continue }
      if (dry) { out.push({ owner, to, subject: mail.subject, status: 'dry' }); continue }
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env('EMAIL_FROM') || 'Estirada <onboarding@resend.dev>', to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
      })
      out.push({ owner, to, subject: mail.subject, status: r.ok ? 'sent' : `error ${r.status}: ${await r.text()}` })
    } catch (e) {
      out.push({ owner: pr.id, status: `error: ${(e as Error).message}` })
    }
  }
  return json({ today, results: out })
})
