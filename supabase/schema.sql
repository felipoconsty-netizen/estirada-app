-- Estirada: esquema de la base de dades (Supabase / Postgres).
-- Executa aquest fitxer sencer a Supabase → SQL Editor → New query → Run.
-- Totes les taules tenen RLS: cada entrenador només veu les seves dades.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  club_name text not null default '',
  town text not null default '',
  coach_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  sport text not null default 'Bàsquet',
  coach text not null default '',
  survey_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  team_id uuid not null references teams on delete cascade,
  name text not null,
  sex text not null check (sex in ('F', 'M')),
  dob date not null,
  father numeric(5,1),
  mother numeric(5,1),
  created_at timestamptz not null default now()
);

create table if not exists measures (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  player_id uuid not null references players on delete cascade,
  date date not null,
  height numeric(5,1) not null check (height between 80 and 240),
  sitting numeric(5,1) not null check (sitting between 40 and 140),
  mass numeric(5,1) not null check (mass between 15 and 180),
  unique (player_id, date)
);

create table if not exists wellness (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  player_id uuid not null references players on delete cascade,
  week date not null, -- dilluns de la setmana
  energy smallint not null check (energy between 1 and 5),
  sleep smallint not null check (sleep between 1 and 5),
  legs smallint not null check (legs between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  mood smallint not null check (mood between 1 and 5),
  pain_zone text,
  pain_level smallint check (pain_level between 0 and 10),
  pain_side text,
  pain_stopped boolean,
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (player_id, week)
);

create table if not exists injuries (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  player_id uuid not null references players on delete cascade,
  date date not null,
  zone text not null,
  note text not null default '',
  status text not null default 'oberta' check (status in ('oberta', 'tancada'))
);

create index if not exists players_team on players (team_id);
create index if not exists measures_player on measures (player_id);
create index if not exists wellness_player on wellness (player_id);
create index if not exists injuries_player on injuries (player_id);

-- Seguretat: cada fila pertany a qui l'ha creat.
alter table profiles enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table measures enable row level security;
alter table wellness enable row level security;
alter table injuries enable row level security;

drop policy if exists own on profiles;
create policy own on profiles for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists own on teams;
create policy own on teams for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own on players;
create policy own on players for all using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from teams t where t.id = team_id and t.owner = auth.uid()));
drop policy if exists own on measures;
create policy own on measures for all using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from players p where p.id = player_id and p.owner = auth.uid()));
drop policy if exists own on wellness;
create policy own on wellness for all using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from players p where p.id = player_id and p.owner = auth.uid()));
drop policy if exists own on injuries;
create policy own on injuries for all using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from players p where p.id = player_id and p.owner = auth.uid()));

-- Qüestionari públic: les jugadores responen amb l'enllaç de l'equip, sense compte.
-- Només retorna el nom de pila, mai cap altra dada.
create or replace function survey_team(token uuid)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'team', t.name,
    'players', coalesce((select json_agg(json_build_object('id', p.id, 'name', split_part(p.name, ' ', 1) || coalesce(' ' || left(nullif(split_part(p.name, ' ', 2), ''), 1) || '.', ''))
                                order by p.name) from players p where p.team_id = t.id), '[]'::json))
  from teams t where t.survey_token = token;
$$;

create or replace function submit_survey(token uuid, player uuid, energy int, sleep int, legs int, stress int, mood int,
  pain_zone text, pain_level int, pain_side text, pain_stopped boolean, comment text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o uuid; wk date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
begin
  select p.owner into o from players p join teams t on t.id = p.team_id where p.id = player and t.survey_token = token;
  if o is null then return false; end if;
  insert into wellness (owner, player_id, week, energy, sleep, legs, stress, mood, pain_zone, pain_level, pain_side, pain_stopped, comment)
  values (o, player, wk, energy, sleep, legs, stress, mood, pain_zone, pain_level, pain_side, pain_stopped, left(nullif(trim(comment), ''), 500))
  on conflict (player_id, week) do update set energy = excluded.energy, sleep = excluded.sleep, legs = excluded.legs,
    stress = excluded.stress, mood = excluded.mood, pain_zone = excluded.pain_zone, pain_level = excluded.pain_level,
    pain_side = excluded.pain_side, pain_stopped = excluded.pain_stopped, comment = excluded.comment, created_at = now();
  return true;
end $$;

revoke all on function survey_team(uuid) from public;
revoke all on function submit_survey(uuid, uuid, int, int, int, int, int, text, int, text, boolean, text) from public;
grant execute on function survey_team(uuid) to anon, authenticated;
grant execute on function submit_survey(uuid, uuid, int, int, int, int, int, text, int, text, boolean, text) to anon, authenticated;

grant select, insert, update, delete on profiles, teams, players, measures, wellness, injuries to authenticated;
