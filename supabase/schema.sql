-- SHIFT · esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query > Run.
-- Es idempotente: se puede volver a ejecutar sin romper datos existentes.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario' check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  category      text check (category is null or char_length(category) <= 30),
  goal_minutes  integer not null check (goal_minutes between 1 and 1440),
  days          smallint[] not null check (cardinality(days) between 1 and 7),
  difficulty    text not null default 'facil' check (difficulty in ('facil','intermedio','avanzado')),
  reminder_time text check (reminder_time is null or reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  color         text not null default 'purple' check (color in ('purple','blue','yellow','green','orange','pink')),
  created_at    timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits(user_id);

-- El id lo genera el cliente (= id del cronómetro): una sesión no puede insertarse dos veces.
create table if not exists public.sessions (
  id           uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  habit_id     uuid not null references public.habits(id) on delete cascade,
  started_at   timestamptz not null,
  ended_at     timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0 and duration_sec <= 86400),
  day          date not null
);
create index if not exists sessions_user_day_idx on public.sessions(user_id, day desc);
create index if not exists sessions_habit_idx on public.sessions(habit_id);

-- Un cronómetro activo (o en pausa) por hábito; sobrevive a recargas y cambios de dispositivo.
create table if not exists public.active_timers (
  habit_id        uuid primary key references public.habits(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id              uuid not null,
  started_at      timestamptz not null,
  accumulated_ms  bigint not null default 0 check (accumulated_ms >= 0),
  running_since   bigint            -- epoch ms del tramo en curso; null = en pausa
);

alter table public.profiles      enable row level security;
alter table public.habits        enable row level security;
alter table public.sessions      enable row level security;
alter table public.active_timers enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "habits_own" on public.habits;
create policy "habits_own" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions_own" on public.sessions;
create policy "sessions_own" on public.sessions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

drop policy if exists "timers_own" on public.active_timers;
create policy "timers_own" on public.active_timers
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

-- Crea el perfil automáticamente al registrarse.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
