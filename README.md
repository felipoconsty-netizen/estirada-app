# Estirada

Creixement i benestar per a equips de bàsquet de formació (10–16 anys).
Calcula la fase de maduració (Mirwald et al., 2002), avisa l'entrenador i genera l'informe per a famílies.

> Versió demo amb dades inventades. Orientació per a l'entrenament, no és un diagnòstic mèdic.

## Fer-la servir

- `npm install`
- `npm run dev` per treballar-hi en local
- `npm run build` per generar la versió final a `dist/`

## Base de dades (Supabase)

1. Crea un projecte a [supabase.com](https://supabase.com) a la regió **Central EU (Frankfurt)**.
2. Obre **SQL Editor → New query**, enganxa tot el contingut de `supabase/schema.sql` i prem **Run**.
3. A **Authentication → URL Configuration**, posa l'adreça de l'app a **Site URL**.
4. Posa la *Project URL* i la clau *anon / publishable* a les variables `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` (fitxer `.env` o al panell del hosting).

Sense aquestes variables, l'app s'obre en mode demo.

## Correu de resum cada dilluns

Cada dilluns al matí cada entrenador/a rep per correu el resum de la setmana (avisos, conclusions del qüestionari i càrrega). Es pot desactivar al perfil.

1. Crea un compte a [resend.com](https://resend.com) i una clau API. Per enviar a qualsevol adreça cal verificar-hi un domini; sense domini només envia a l'adreça del compte de Resend.
2. Desplega la funció: `npm run build:email` i després `supabase functions deploy monday-summary --no-verify-jwt`.
3. A Supabase → Edge Functions → Secrets, posa `RESEND_API_KEY`, `CRON_SECRET` (una contrasenya llarga inventada), `APP_URL` (l'adreça de l'app) i, si tens domini, `EMAIL_FROM` (per exemple `Estirada <resum@elteudomini.cat>`).
4. Obre `supabase/cron.sql`, canvia `<PROJECT_REF>` i `<CRON_SECRET>` i executa'l al SQL Editor.

Per provar-la sense enviar res, crida la funció amb `?dry` i la capçalera `x-cron-secret`.

## Publicar-la

Importa aquest repositori a [Vercel](https://vercel.com/new) i prem **Deploy**. No cal configurar res.
És una app instal·lable (PWA): des del mòbil, obre l'enllaç i tria "Afegeix a la pantalla d'inici".

## Tecnologia

React + Vite + TypeScript + Tailwind, amb `vite-plugin-pwa`.
