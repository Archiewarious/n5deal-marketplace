-- N5Deal marketplace prototype — schema
-- Roles, listings and contact requests. Access is enforced in the database via RLS,
-- so the API layer cannot accidentally widen permissions.

create type user_role      as enum ('BUYER','SELLER','MANAGER');
create type user_status    as enum ('ACTIVE','SUSPENDED');
create type asset_kind     as enum ('LICENSE_ONLY','ACTIVE_BUSINESS');
create type business_state as enum ('ACTIVE','NOT_ACTIVE');
create type listing_state  as enum ('DRAFT','PUBLISHED','SUSPENDED','REMOVED');

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text        not null,
  full_name  text        not null,
  company    text,
  role       user_role   not null default 'BUYER',
  status     user_status not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

-- Investment mandate of a buyer. Sellers browse this to find matching counterparties.
create table buyer_profiles (
  user_id        uuid primary key references profiles on delete cascade,
  headline       text,
  description    text,
  sectors        text[] not null default '{}',
  jurisdictions  text[] not null default '{}',
  ticket_min_eur bigint,
  ticket_max_eur bigint,
  updated_at     timestamptz not null default now()
);

create table assets (
  id                  uuid primary key default gen_random_uuid(),
  public_id           bigint generated always as identity,
  seller_id           uuid not null references profiles on delete cascade,
  title               text not null,
  description         text,
  country             text not null,
  sector              text not null,
  license_type        text not null,
  regulator           text,
  asset_kind          asset_kind     not null,
  business_state      business_state not null,
  year_of_issue       int,
  employees           int,
  -- money is stored in whole euro cents; floats are never used for prices
  asking_price_cents  bigint not null check (asking_price_cents >= 0),
  included_activities text[] not null default '{}',
  status              listing_state not null default 'PUBLISHED',
  validated           boolean not null default false,
  views               int not null default 0,
  created_at          timestamptz not null default now()
);

create index assets_status_idx  on assets (status);
create index assets_sector_idx  on assets (sector);
create index assets_country_idx on assets (country);
create index assets_seller_idx  on assets (seller_id);

create table contact_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references profiles on delete cascade,
  to_user_id   uuid not null references profiles on delete cascade,
  asset_id     uuid references assets on delete set null,
  message      text not null,
  created_at   timestamptz not null default now()
);

create index contact_to_idx   on contact_requests (to_user_id);
create index contact_from_idx on contact_requests (from_user_id);

-- Helpers. security definer so a policy can read profiles without recursing into its own RLS.
create or replace function current_role_of() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'ACTIVE' from profiles where id = auth.uid()), false)
$$;

alter table profiles         enable row level security;
alter table buyer_profiles   enable row level security;
alter table assets           enable row level security;
alter table contact_requests enable row level security;

-- profiles: everyone signed in sees the directory; you edit yourself; a manager edits anyone.
create policy profiles_read on profiles
  for select to authenticated using (true);

create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_manager on profiles
  for update to authenticated using (current_role_of() = 'MANAGER');

-- buyer mandates: readable by anyone signed in, writable only by the buyer.
create policy buyer_read on buyer_profiles
  for select to authenticated using (true);

create policy buyer_write on buyer_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- assets: published listings are public to active users; sellers always see their own;
-- managers see everything including removed rows.
create policy assets_read on assets
  for select to authenticated using (
       (status = 'PUBLISHED' and is_active_user())
    or seller_id = auth.uid()
    or current_role_of() = 'MANAGER'
  );

create policy assets_insert on assets
  for insert to authenticated
  with check (seller_id = auth.uid() and current_role_of() = 'SELLER' and is_active_user());

create policy assets_update_own on assets
  for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy assets_update_manager on assets
  for update to authenticated using (current_role_of() = 'MANAGER');

-- contact requests: visible to the two sides and to a manager.
create policy contact_read on contact_requests
  for select to authenticated using (
    from_user_id = auth.uid() or to_user_id = auth.uid() or current_role_of() = 'MANAGER'
  );

create policy contact_insert on contact_requests
  for insert to authenticated
  with check (from_user_id = auth.uid() and is_active_user());

-- ─────────────────────────────────────────────────────────────────────────────
-- Column-level guard on profiles.
--
-- RLS in Postgres decides which ROWS a statement may touch, never which COLUMNS.
-- `profiles_update_self` checks `id = auth.uid()` and nothing else, and Supabase grants
-- `authenticated` UPDATE on every column by default — so the row owner could rewrite their
-- own `role` and `status`. Verified against the live database before this trigger existed:
-- a SUSPENDED buyer sent two PATCH requests to /rest/v1/profiles with the publishable key
-- already present in the browser bundle, came back as an ACTIVE MANAGER, and went from
-- seeing 0 listings to seeing all 16 including other sellers' drafts.
--
-- A column-level GRANT is the wrong instrument here: a manager reaches PostgREST as the
-- same `authenticated` role, so revoking UPDATE on `status` would disarm the suspend button
-- as well. The trigger keeps the manager's write and silently restores the two privileged
-- columns for everyone else.
create or replace function profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if current_role_of() is distinct from 'MANAGER' then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end
$fn$;

drop trigger if exists profiles_guard on profiles;
create trigger profiles_guard
  before update on profiles
  for each row execute function profiles_guard();
