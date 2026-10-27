-- Equip tècnic: el titular del compte dona accés a altres persones pel seu correu.
-- director: veu i edita tots els equips · entrenador: veu i edita l'equip assignat (o tots) · fisio: veu l'equip i edita lesions.
-- Les files sempre pertanyen al titular (owner), encara que les creï algú de l'equip tècnic.

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  role text not null check (role in ('director', 'entrenador', 'fisio')),
  team_id uuid references teams on delete cascade, -- null = tots els equips
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner, email, team_id)
);
create index if not exists staff_email on staff (email);

create or replace function my_email() returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Rol de l'usuari actual en un equip: owner, director, entrenador, fisio o null.
create or replace function team_role(team uuid) returns text language sql stable security definer set search_path = public as $$
  select case when t.owner = auth.uid() then 'owner' else (
    select s.role from staff s
    where s.owner = t.owner and s.email = my_email() and my_email() <> '' and (s.team_id is null or s.team_id = t.id)
    order by case s.role when 'director' then 0 when 'entrenador' then 1 else 2 end limit 1) end
  from teams t where t.id = team
$$;
create or replace function player_team(player uuid) returns uuid language sql stable security definer set search_path = public as $$
  select team_id from players where id = player
$$;
create or replace function can_see(team uuid) returns boolean language sql stable as $$ select team_role(team) is not null $$;
create or replace function can_edit(team uuid) returns boolean language sql stable as $$ select coalesce(team_role(team) in ('owner', 'director', 'entrenador'), false) $$;

-- El titular de cada fila és sempre el de l'equip.
create or replace function set_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'teams' then
    if tg_op = 'UPDATE' then new.owner := old.owner; end if;
  elsif tg_table_name in ('players', 'warmups') then
    select owner into new.owner from teams where id = new.team_id;
  else
    select owner into new.owner from players where id = new.player_id;
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['teams', 'players', 'measures', 'wellness', 'injuries', 'loads', 'warmups'] loop
    execute format('drop trigger if exists set_owner on %I', t);
    execute format('create trigger set_owner before insert or update on %I for each row execute function set_owner()', t);
  end loop;
end $$;

alter table staff enable row level security;
drop policy if exists own on staff;
drop policy if exists mine on staff;
create policy own on staff for all using (owner = auth.uid())
  with check (owner = auth.uid() and (team_id is null or exists (select 1 from teams t where t.id = team_id and t.owner = auth.uid())));
create policy mine on staff for select using (email = my_email() and my_email() <> '');
grant select, insert, update, delete on staff to authenticated;

-- L'equip tècnic pot llegir el perfil del club (nom i població).
drop policy if exists staff_read on profiles;
create policy staff_read on profiles for select using (exists (select 1 from staff s where s.owner = profiles.id and s.email = my_email() and my_email() <> ''));

drop policy if exists own on teams;
drop policy if exists see on teams;
drop policy if exists add on teams;
drop policy if exists edit on teams;
drop policy if exists del on teams;
create policy see on teams for select using (can_see(id));
create policy add on teams for insert with check (owner = auth.uid());
create policy edit on teams for update using (can_edit(id)) with check (can_edit(id));
create policy del on teams for delete using (owner = auth.uid());

drop policy if exists own on players;
drop policy if exists see on players;
drop policy if exists edit on players;
create policy see on players for select using (can_see(team_id));
create policy edit on players for all using (can_edit(team_id)) with check (can_edit(team_id));

do $$ declare t text; begin
  foreach t in array array['measures', 'wellness', 'loads'] loop
    execute format('drop policy if exists own on %I', t);
    execute format('drop policy if exists see on %I', t);
    execute format('drop policy if exists edit on %I', t);
    execute format('create policy see on %I for select using (can_see(player_team(player_id)))', t);
    execute format('create policy edit on %I for all using (can_edit(player_team(player_id))) with check (can_edit(player_team(player_id)))', t);
  end loop;
end $$;

drop policy if exists own on injuries;
drop policy if exists see on injuries;
drop policy if exists edit on injuries;
create policy see on injuries for select using (can_see(player_team(player_id)));
create policy edit on injuries for all using (can_see(player_team(player_id))) with check (can_see(player_team(player_id)));

drop policy if exists own on warmups;
drop policy if exists see on warmups;
drop policy if exists edit on warmups;
create policy see on warmups for select using (can_see(team_id));
create policy edit on warmups for all using (can_edit(team_id)) with check (can_edit(team_id));
