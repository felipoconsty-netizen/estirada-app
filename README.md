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

## Publicar-la

Importa aquest repositori a [Vercel](https://vercel.com/new) i prem **Deploy**. No cal configurar res.
És una app instal·lable (PWA): des del mòbil, obre l'enllaç i tria "Afegeix a la pantalla d'inici".

## Tecnologia

React + Vite + TypeScript + Tailwind, amb `vite-plugin-pwa`.
