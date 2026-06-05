-- Pour'd — Supabase Schema
-- Run this in your Supabase SQL Editor

-- ─── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  bio           text,
  total_checkins int not null default 0,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Wines ─────────────────────────────────────────────────────────────────────
create table wines (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  winery          text not null,
  varietals       text[] not null default '{}',
  region          text[],
  country         text,
  vintage         int,
  label_image_url text,
  official_notes  text,              -- comma-separated tasting notes
  avg_rating      numeric(3,2),
  total_checkins  int not null default 0,
  created_at      timestamptz not null default now()
);

create index wines_name_idx   on wines using gin (to_tsvector('english', name));
create index wines_winery_idx on wines using gin (to_tsvector('english', winery));

-- ─── Venues ────────────────────────────────────────────────────────────────────
create type venue_type as enum ('restaurant', 'bar', 'winery', 'shop', 'home', 'other');

create table venues (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  type       venue_type not null default 'other',
  address    text,
  city       text,
  country    text,
  latitude   double precision,
  longitude  double precision,
  created_at timestamptz not null default now()
);

-- ─── Check-ins ─────────────────────────────────────────────────────────────────
create type serving_style as enum ('glass', 'bottle', 'tasting');

create table checkins (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  wine_id        uuid not null references wines(id)   on delete cascade,
  venue_id       uuid references venues(id) on delete set null,
  rating         int not null check (rating >= 1 and rating <= 5),
  description    text,
  guessed_notes  text[],
  actual_notes   text[],
  serving_style  serving_style,
  photo_url      text,
  is_public      boolean not null default true,
  created_at     timestamptz not null default now()
);

create index checkins_user_idx  on checkins(user_id, created_at desc);
create index checkins_wine_idx  on checkins(wine_id, created_at desc);
create index checkins_feed_idx  on checkins(is_public, created_at desc) where is_public = true;

-- ─── Update wine stats on checkin ──────────────────────────────────────────────
create or replace function update_wine_stats()
returns trigger language plpgsql security definer as $$
begin
  update wines
  set
    total_checkins = (select count(*) from checkins where wine_id = new.wine_id),
    avg_rating     = (select avg(rating) from checkins where wine_id = new.wine_id)
  where id = new.wine_id;

  update profiles
  set total_checkins = (select count(*) from checkins where user_id = new.user_id)
  where id = new.user_id;

  return new;
end;
$$;

create trigger on_checkin_created
  after insert on checkins
  for each row execute procedure update_wine_stats();

-- ─── Row Level Security ─────────────────────────────────────────────────────────
alter table profiles  enable row level security;
alter table wines     enable row level security;
alter table venues    enable row level security;
alter table checkins  enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Wines: anyone can read, authenticated users can insert
create policy "wines_select" on wines for select using (true);
create policy "wines_insert" on wines for insert with check (auth.role() = 'authenticated');

-- Venues: anyone can read, authenticated users can insert
create policy "venues_select" on venues for select using (true);
create policy "venues_insert" on venues for insert with check (auth.role() = 'authenticated');

-- Checkins: public ones readable by all, private only by owner
create policy "checkins_select_public"  on checkins for select using (is_public = true);
create policy "checkins_select_own"     on checkins for select using (auth.uid() = user_id);
create policy "checkins_insert"         on checkins for insert with check (auth.uid() = user_id);
create policy "checkins_update"         on checkins for update using (auth.uid() = user_id);
create policy "checkins_delete"         on checkins for delete using (auth.uid() = user_id);

-- ─── Clinks ────────────────────────────────────────────────────────────────────
create table clinks (
  id          uuid primary key default uuid_generate_v4(),
  checkin_id  uuid not null references checkins(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(checkin_id, user_id)
);

create index clinks_checkin_idx on clinks(checkin_id);

alter table clinks enable row level security;

create policy "clinks_select" on clinks for select using (true);
create policy "clinks_insert" on clinks for insert with check (auth.uid() = user_id);
create policy "clinks_delete" on clinks for delete using (auth.uid() = user_id);

-- ─── Sample seed data (optional) ───────────────────────────────────────────────
-- Uncomment to seed some wines for testing
/*
insert into wines (name, winery, varietals, region, country, vintage, official_notes) values
  ('Stags'' Leap', 'Stag''s Leap Wine Cellars', ARRAY['Cabernet Sauvignon'], ARRAY['Napa Valley'], 'USA', 2019,
   'Black cherry, cassis, cedar, tobacco, dark chocolate'),
  ('1978 Pinot Noir', 'Au Bon Climat', ARRAY['Pinot Noir'], ARRAY['Santa Barbara'], 'USA', 2021,
   'Cherry, raspberry, violet, mushroom, spice'),
  ('Sancerre Blanc', 'Henri Bourgeois', ARRAY['Sauvignon Blanc'], ARRAY['Loire Valley'], 'France', 2022,
   'Grapefruit, lemon, grass, wet stone, mineral'),
  ('Amarone della Valpolicella', 'Allegrini', ARRAY['Corvina', 'Rondinella', 'Molinara'], ARRAY['Valpolicella'], 'Italy', 2018,
   'Dark cherry, plum, fig, chocolate, tobacco, leather');
*/
