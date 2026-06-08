create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null default 'match_1x2',
  target_type text not null default 'match',
  target_id text not null,
  selection text not null,
  confidence numeric,
  odds_snapshot jsonb not null default '{}'::jsonb,
  model_snapshot jsonb not null default '{}'::jsonb,
  ai_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  locked_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'locked', 'settled', 'void')),
  actual_result text,
  points numeric not null default 0,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_type, target_id)
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null check (signal_type in ('champion', 'match')),
  target_id text not null,
  market_prob numeric not null,
  model_prob numeric not null,
  ai_prob numeric,
  fused_prob numeric not null,
  edge numeric not null,
  action text not null,
  kelly_fraction numeric,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.signals(id) on delete cascade,
  outcome text not null check (outcome in ('pending', 'win', 'loss', 'push')),
  actual_result text,
  pnl numeric,
  resolved_at timestamptz
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  outcome_label text not null,
  price numeric not null,
  volume numeric,
  liquidity numeric,
  captured_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists user_predictions_user_created_idx on public.user_predictions (user_id, created_at desc);
create index if not exists user_predictions_target_idx on public.user_predictions (game_type, target_id);
create index if not exists user_predictions_status_idx on public.user_predictions (status, created_at desc);
create index if not exists user_favorites_user_type_idx on public.user_favorites (user_id, item_type);
create index if not exists signals_type_created_idx on public.signals (signal_type, created_at desc);
create index if not exists signals_target_created_idx on public.signals (target_id, created_at desc);
create index if not exists signal_outcomes_signal_idx on public.signal_outcomes (signal_id);
create index if not exists market_snapshots_slug_label_time_idx on public.market_snapshots (event_slug, outcome_label, captured_at desc);

alter table public.profiles enable row level security;
alter table public.user_predictions enable row level security;
alter table public.user_favorites enable row level security;
alter table public.signals enable row level security;
alter table public.signal_outcomes enable row level security;
alter table public.market_snapshots enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists user_predictions_touch_updated_at on public.user_predictions;
create trigger user_predictions_touch_updated_at
before update on public.user_predictions
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles read own') then
    create policy "profiles read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles update own') then
    create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_predictions' and policyname = 'predictions own CRUD') then
    create policy "predictions own CRUD" on public.user_predictions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_favorites' and policyname = 'favorites own CRUD') then
    create policy "favorites own CRUD" on public.user_favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'signals public read') then
    create policy "signals public read" on public.signals for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signal_outcomes' and policyname = 'signal outcomes public read') then
    create policy "signal outcomes public read" on public.signal_outcomes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'market_snapshots' and policyname = 'market snapshots public read') then
    create policy "market snapshots public read" on public.market_snapshots for select to anon, authenticated using (true);
  end if;
end $$;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_predictions to authenticated;
grant select, insert, update, delete on public.user_favorites to authenticated;
grant select on public.signals to anon, authenticated;
grant select on public.signal_outcomes to anon, authenticated;
grant select on public.market_snapshots to anon, authenticated;
