-- ── Four public numbers, and nothing else ────────────────────────────────────
--
-- The landing page is the one screen an anonymous visitor sees, and a marketplace that cannot
-- say how big it is has nothing to say at all. But `assets` and `profiles` are deliberately
-- closed to anon: 03_hardening.sql narrowed both after the audit found the participant
-- directory, with email addresses and buyer budgets, readable by anyone holding the publishable
-- key.
--
-- Rather than reopen a table to get a count, this returns the count itself. It is
-- `security definer`, so state exactly what it can leak: four aggregates over PUBLISHED rows —
-- how many listings, how many jurisdictions, how many active participants, and the total of the
-- asking prices. No row, no id, no title, no email ever leaves it. Anything narrower would not
-- fill a landing page; anything wider would undo the audit.
--
-- `set search_path = public` is not decoration on a definer function: without it a caller can
-- point `assets` at a table of their own and have the owner's rights execute against it.
create or replace function public.platform_stats()
returns json
language sql
security definer
stable
set search_path = public
as $fn$
  select json_build_object(
    'listings',      (select count(*) from assets a
                        join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    'jurisdictions', (select count(distinct a.country) from assets a
                        join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    'participants',  (select count(*) from profiles where status = 'ACTIVE'),
    'value_cents',   (select coalesce(sum(a.asking_price_cents), 0) from assets a
                        join profiles p on p.id = a.seller_id
                       where a.status = 'PUBLISHED' and p.status = 'ACTIVE'),
    -- The inventory as a shape: which jurisdictions, how many in each. Still an aggregate --
    -- a count per country names no listing and identifies no seller.
    'by_country',    (select coalesce(json_agg(row_to_json(t) order by t.n desc, t.country), '[]'::json)
                        from (select a.country, count(*)::int as n
                                from assets a
                                join profiles p on p.id = a.seller_id
                               where a.status = 'PUBLISHED' and p.status = 'ACTIVE'
                               group by a.country) t),
    'by_sector',     (select coalesce(json_agg(row_to_json(t) order by t.n desc, t.sector), '[]'::json)
                        from (select a.sector, count(*)::int as n
                                from assets a
                                join profiles p on p.id = a.seller_id
                               where a.status = 'PUBLISHED' and p.status = 'ACTIVE'
                               group by a.sector) t)
  );
$fn$;

revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to anon, authenticated;
