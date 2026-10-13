// Connexió amb Supabase. La clau "anon / publishable" és pública per disseny:
// la seguretat la garanteixen les polítiques RLS de supabase/schema.sql.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
