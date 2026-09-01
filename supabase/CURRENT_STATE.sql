-- ─────────────────────────────────────────────────────────────────────────────
--  N5Deal — what is actually in the database right now
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The numbered files beside this one are migrations: they say how the database got here, in the
-- order it happened, including the two access-control holes that were found live and closed in
-- 03 and 05. Useful history, and the wrong thing to read if the question is simply "what are the
-- rules today".
--
-- This file is that answer. Everything below the type and table definitions was read out of the
-- running instance with pg_get_functiondef, pg_get_triggerdef, pg_policies and pg_indexes, so it
-- is the live state rather than a reconstruction — 8 functions, 11 policies, 2 triggers and 10
-- indexes in the public schema.
--
-- Do not run this file. It is for reading. To build the database, run 01 through 07 in order.
--
-- One object is deliberately missing: the trigger `on_auth_user_created` lives on `auth.users`,
-- outside the public schema, so the introspection did not reach it. It is the one that turns a
-- sign-up into a profile row, and it is in 06_signup.sql.

-- ── Types and tables ─────────────────────────────────────────────────────────

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


-- ── Functions ────────────────────────────────────────────────────────────────
--
-- Every one is `security definer` with an explicit `search_path`. That combination is the point:
-- a policy cannot read `profiles` to decide access without recursing into its own RLS, and a
-- definer function without a pinned search_path is a privilege-escalation waiting for someone to
-- create a shadowing schema.


-- assets_guard
CREATE OR REPLACE FUNCTION public.assets_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null
     and not (current_role_of() = 'MANAGER' and is_active_user()) then
    if tg_op = 'INSERT' then
      new.validated := false;
      if new.status not in ('DRAFT', 'PUBLISHED') then new.status := 'DRAFT'; end if;
    else
      new.validated := old.validated;
      if old.status in ('SUSPENDED', 'REMOVED') then new.status := old.status;
      elsif new.status not in ('DRAFT', 'PUBLISHED') then new.status := old.status; end if;
    end if;
  end if;
  return new;
end
$function$;

-- bump_asset_views
CREATE OR REPLACE FUNCTION public.bump_asset_views(a uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update assets
     set views = views + 1
   where id = a
     and status = 'PUBLISHED'
     -- The owner reading their own listing is not a view. Without this line a seller could
     -- inflate their own counter by refreshing, which is the first thing anyone would try.
     and seller_id is distinct from auth.uid();
end
$function$;

-- current_role_of
CREATE OR REPLACE FUNCTION public.current_role_of()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from profiles where id = auth.uid()
$function$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  wanted text := coalesce(new.raw_user_meta_data ->> 'role', 'BUYER');
begin
  insert into profiles (id, email, full_name, company, role, status)
  values (
    new.id,
    new.email,
    -- A name is required by the schema and the form makes it required too, but a user can also
    -- be created from the Supabase dashboard with no metadata at all, and a trigger that throws
    -- there would break user creation for the project owner.
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'company'), ''),
    -- The clamp. Anything that is not exactly SELLER becomes BUYER, so a crafted sign-up request
    -- asking for MANAGER gets an ordinary buyer account and no error to learn from.
    case when wanted = 'SELLER' then 'SELLER'::user_role else 'BUYER'::user_role end,
    'ACTIVE'
  )
  on conflict (id) do nothing;

  return new;
end
$function$;

-- is_active_user
CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select status = 'ACTIVE' from profiles where id = auth.uid()), false)
$function$;

-- platform_stats
CREATE OR REPLACE FUNCTION public.platform_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object(
    'listings',      (select count(*) from assets a join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    'jurisdictions', (select count(distinct a.country) from assets a join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    'participants',  (select count(*) from profiles where status = 'ACTIVE'),
    'value_cents',   (select coalesce(sum(a.asking_price_cents), 0) from assets a join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    'by_country',    (select coalesce(json_agg(row_to_json(t) order by t.n desc, t.country), '[]'::json)
                        from (select a.country, count(*)::int as n from assets a join profiles p on p.id = a.seller_id
                               where a.status = 'PUBLISHED' and p.status = 'ACTIVE' group by a.country) t),
    'by_sector',     (select coalesce(json_agg(row_to_json(t) order by t.n desc, t.sector), '[]'::json)
                        from (select a.sector, count(*)::int as n from assets a join profiles p on p.id = a.seller_id
                               where a.status = 'PUBLISHED' and p.status = 'ACTIVE' group by a.sector) t)
  );
$function$;

-- profiles_guard
CREATE OR REPLACE FUNCTION public.profiles_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null
     and not (current_role_of() = 'MANAGER' and is_active_user()) then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end
$function$;

-- rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;


-- ── Row level security policies ──────────────────────────────────────────────
--
-- These are the access rules. Not the API, not the interface — these. Read them as the answer to
-- "what can this role actually reach", because they hold no matter which endpoint asks.


-- assets_insert on assets
--   FOR INSERT TO authenticated USING - WITH CHECK ((seller_id = auth.uid()) AND (current_role_of() = 'SELLER'::user_role) AND is_active_user())

-- assets_read on assets
--   FOR SELECT TO authenticated USING (((status = 'PUBLISHED'::listing_state) AND is_active_user() AND (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = assets.seller_id) AND (p.status = 'ACTIVE'::user_status))))) OR (seller_id = auth.uid()) OR ((current_role_of() = 'MANAGER'::user_role) AND is_active_user())) WITH CHECK -

-- assets_update_manager on assets
--   FOR UPDATE TO authenticated USING ((current_role_of() = 'MANAGER'::user_role) AND is_active_user()) WITH CHECK -

-- assets_update_own on assets
--   FOR UPDATE TO authenticated USING ((seller_id = auth.uid()) AND is_active_user()) WITH CHECK ((seller_id = auth.uid()) AND is_active_user())

-- buyer_read on buyer_profiles
--   FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR (is_active_user() AND (current_role_of() = ANY (ARRAY['SELLER'::user_role, 'MANAGER'::user_role])) AND ((current_role_of() = 'MANAGER'::user_role) OR (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = buyer_profiles.user_id) AND (p.status = 'ACTIVE'::user_status))))))) WITH CHECK -

-- buyer_write on buyer_profiles
--   FOR ALL TO authenticated USING ((user_id = auth.uid()) AND is_active_user()) WITH CHECK ((user_id = auth.uid()) AND is_active_user())

-- contact_insert on contact_requests
--   FOR INSERT TO authenticated USING - WITH CHECK ((from_user_id = auth.uid()) AND is_active_user())

-- contact_read on contact_requests
--   FOR SELECT TO authenticated USING ((from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR ((current_role_of() = 'MANAGER'::user_role) AND is_active_user())) WITH CHECK -

-- profiles_read on profiles
--   FOR SELECT TO authenticated USING ((id = auth.uid()) OR is_active_user()) WITH CHECK -

-- profiles_update_manager on profiles
--   FOR UPDATE TO authenticated USING ((current_role_of() = 'MANAGER'::user_role) AND is_active_user()) WITH CHECK -

-- profiles_update_self on profiles
--   FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())


-- ── Triggers ─────────────────────────────────────────────────────────────────
--
-- RLS restricts rows; it cannot restrict columns. These two are the column guards: without them
-- a seller could set `validated` on their own listing, or drag a suspended listing back into the
-- catalogue. Both of those were possible once, and both were found by trying them rather than by
-- reading the policies.


CREATE TRIGGER assets_guard BEFORE INSERT OR UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION assets_guard();

CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_guard();


-- ── Indexes ──────────────────────────────────────────────────────────────────


CREATE INDEX assets_country_idx ON public.assets USING btree (country);

CREATE UNIQUE INDEX assets_pkey ON public.assets USING btree (id);

CREATE INDEX assets_sector_idx ON public.assets USING btree (sector);

CREATE INDEX assets_seller_idx ON public.assets USING btree (seller_id);

CREATE INDEX assets_status_idx ON public.assets USING btree (status);

CREATE UNIQUE INDEX buyer_profiles_pkey ON public.buyer_profiles USING btree (user_id);

CREATE INDEX contact_from_idx ON public.contact_requests USING btree (from_user_id);

CREATE UNIQUE INDEX contact_requests_pkey ON public.contact_requests USING btree (id);

CREATE INDEX contact_to_idx ON public.contact_requests USING btree (to_user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
