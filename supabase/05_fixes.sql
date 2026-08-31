-- ── Two holes a second audit found, after the first one was written up ───────
--
-- Both are the same mistake in two places: a rule was written for the case that was in front of
-- me and not for its mirror.

-- ── 1. The validated badge was guarded on UPDATE and not on INSERT ───────────
--
-- 03_hardening.sql closed the hole where a seller edited `validated` to true on an existing
-- listing. It did not close the one where a seller simply CREATES a listing with it already set,
-- because `assets_guard` was declared `before update` only. The insert policy checks the seller
-- owns the row and nothing about the columns.
--
-- SECURITY.md and the landing page both say a seller cannot award itself the badge. They were
-- wrong for the whole time this trigger existed. Reproduced with the publishable key:
--   POST /rest/v1/assets  {"seller_id":"<self>", ..., "validated":true}  -> 201, validated true
--
-- The same function now serves both events. On INSERT there is no `old`, so the branch has to
-- fork: an update restores the previous value, an insert forces the default.
create or replace function assets_guard() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  -- The database owner (no auth.uid()) and an active manager are the two callers allowed to
  -- set these columns. Everyone else gets them decided for them.
  if auth.uid() is not null
     and not (current_role_of() = 'MANAGER' and is_active_user()) then

    if tg_op = 'INSERT' then
      -- A new listing is never validated and never starts in a moderated state.
      new.validated := false;
      if new.status not in ('DRAFT', 'PUBLISHED') then
        new.status := 'DRAFT';
      end if;
    else
      new.validated := old.validated;
      if old.status in ('SUSPENDED', 'REMOVED') then
        new.status := old.status;
      elsif new.status not in ('DRAFT', 'PUBLISHED') then
        new.status := old.status;
      end if;
    end if;

  end if;
  return new;
end
$fn$;

drop trigger if exists assets_guard on assets;
create trigger assets_guard before insert or update on assets
  for each row execute function assets_guard();

-- ── 2. Suspending a buyer left their mandate on the seller's desk ────────────
--
-- 03_hardening.sql made a suspended seller's listings leave the catalogue with them, and wrote
-- that up as hole #5. The mirror was never written: a suspended buyer's mandate stayed in the
-- seller-facing directory, and a seller could still open it and write to them.
--
-- `user_id = auth.uid()` stays first so a suspended buyer can still read and repair their own
-- mandate — suspension hides an account from other people, it does not lock them out of their
-- own row.
drop policy if exists buyer_read on buyer_profiles;
create policy buyer_read on buyer_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      is_active_user()
      and current_role_of() in ('SELLER', 'MANAGER')
      and (
        -- a manager moderates suspended accounts, so they keep seeing them
        current_role_of() = 'MANAGER'
        or exists (select 1 from profiles p where p.id = buyer_profiles.user_id
                     and p.status = 'ACTIVE')
      )
    )
  );

-- ── 3. Clean up after the audit ──────────────────────────────────────────────
--
-- Proving hole #1 meant actually inserting listings with the validated column set, and
-- PostgREST does not honour a rollback preference on this project, so every probe committed.
-- Two rows survived and a couple of public_id values were consumed and rolled back.
--
-- No table has a delete policy, by design — nothing on this platform is ever deleted through the
-- application. The owner has no such restriction, and a test artefact is exactly the case where
-- the owner should reach past the rule rather than leave litter in the catalogue.
delete from assets
 where title in (
   'AUDIT PROBE delete me',
   'ZZ probe row (audit artefact) — safe to delete in SQL editor',
   'Audit probe (hole #1), kept as evidence'
 );

-- After this runs, the honest counts are: manager 31, each seller 30, buyer 29, suspended 0.
select
  (select count(*) from assets) as manager_sees,
  (select count(*) from assets where status = 'PUBLISHED') as buyer_sees;
