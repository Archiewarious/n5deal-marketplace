-- ══════════════════════════════════════════════════════════════════════════════
-- Hardening.
--
-- Everything here was added after an audit found that the policies in 01_schema.sql do not
-- hold on their own. Each block names the hole it closes and how that hole was demonstrated
-- against the live database, because a security claim that was never attacked is a guess.
--
-- Run this after 01_schema.sql.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Column-level guard on profiles ────────────────────────────────────────────
-- RLS decides which ROWS a statement may touch, never which COLUMNS, and Supabase grants
-- `authenticated` UPDATE on every column by default. `profiles_update_self` checks only
-- `id = auth.uid()`, so the row owner could rewrite their own role and status.
--
-- Demonstrated before this fix: the SUSPENDED demo buyer sent two PATCH requests to
-- /rest/v1/profiles with the publishable key that already ships in the browser bundle, came
-- back as an ACTIVE MANAGER, and went from seeing 0 listings to all 16 — including other
-- sellers' drafts and the whole message history of the platform.
--
-- A column-level GRANT is the wrong instrument here: a manager reaches PostgREST as the same
-- `authenticated` role, so revoking UPDATE on `status` would disarm the suspend button too.
--
-- Two subtleties, both found by testing rather than by reading:
--   * the condition is ACTIVE manager, not the MANAGER role — suspension does not strip the
--     role, so a role-only check let a suspended manager lift their own suspension;
--   * `auth.uid() is null` means the caller is not an application user at all (SQL editor,
--     a migration, a privileged job). Without that clause the trigger silently reverted the
--     database owner as well — and that path is exactly how a locked-out manager is restored.
create or replace function profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null
     and not (current_role_of() = 'MANAGER' and is_active_user()) then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end
$fn$;

drop trigger if exists profiles_guard on profiles;
create trigger profiles_guard before update on profiles
  for each row execute function profiles_guard();

-- ── The same problem on assets ────────────────────────────────────────────────
-- A seller could award themselves the Validated badge, and could drag a listing back out of
-- SUSPENDED or REMOVED after a manager put it there, undoing moderation entirely.
create or replace function assets_guard() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null
     and not (current_role_of() = 'MANAGER' and is_active_user()) then
    new.validated := old.validated;
    if old.status in ('SUSPENDED','REMOVED') then
      new.status := old.status;
    elsif new.status not in ('DRAFT','PUBLISHED') then
      new.status := old.status;
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists assets_guard on assets;
create trigger assets_guard before update on assets
  for each row execute function assets_guard();

-- ── Suspension has to mean something on writes ────────────────────────────────
-- A suspended account kept full write access, and every manager branch keyed on the role
-- while ignoring the status — so a suspended manager stayed omnipotent.
drop policy if exists assets_update_own on assets;
create policy assets_update_own on assets
  for update to authenticated
  using (seller_id = auth.uid() and is_active_user())
  with check (seller_id = auth.uid() and is_active_user());

drop policy if exists assets_update_manager on assets;
create policy assets_update_manager on assets
  for update to authenticated
  using (current_role_of() = 'MANAGER' and is_active_user());

drop policy if exists buyer_write on buyer_profiles;
create policy buyer_write on buyer_profiles
  for all to authenticated
  using (user_id = auth.uid() and is_active_user())
  with check (user_id = auth.uid() and is_active_user());

drop policy if exists profiles_update_manager on profiles;
create policy profiles_update_manager on profiles
  for update to authenticated
  using (current_role_of() = 'MANAGER' and is_active_user());

-- ── Suspending a seller must take their listings off the market ───────────────
-- Without the exists() clause a suspended seller lost their own access while their listings
-- kept selling. Verified: suspending one demo seller drops a buyer from 14 visible listings
-- to 7, and restoring them puts it back to 14.
drop policy if exists assets_read on assets;
create policy assets_read on assets
  for select to authenticated
  using (
       (status = 'PUBLISHED' and is_active_user()
         and exists (select 1 from profiles p where p.id = assets.seller_id and p.status = 'ACTIVE'))
    or seller_id = auth.uid()
    or (current_role_of() = 'MANAGER' and is_active_user())
  );

-- ── The directory is not public ───────────────────────────────────────────────
-- profiles carries email addresses; buyer_profiles states what someone is willing to pay.
-- `using (true)` handed both to anyone holding a session — a suspended account, or a stranger
-- who signed themselves up through the public key and never had a profile at all.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated
  using (id = auth.uid() or is_active_user());

drop policy if exists buyer_read on buyer_profiles;
create policy buyer_read on buyer_profiles
  for select to authenticated
  using (user_id = auth.uid() or (is_active_user() and current_role_of() in ('SELLER','MANAGER')));

drop policy if exists contact_read on contact_requests;
create policy contact_read on contact_requests
  for select to authenticated
  using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
    or (current_role_of() = 'MANAGER' and is_active_user())
  );
