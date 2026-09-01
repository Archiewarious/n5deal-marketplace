-- ── The view counter that never counted ──────────────────────────────────────
--
-- `assets.views` is seeded, displayed on every card, totalled on the seller's dashboard and
-- offered as a sort order — and nothing has ever incremented it. Open a listing fifty times and
-- it still reads whatever the seed put there, which for anything published through the form is
-- zero. Four pieces of interface reading a number that cannot move is worse than not having the
-- number: it looks like the page is broken.
--
-- It cannot be an ordinary UPDATE from the client. `assets_update_own` only lets a seller write
-- their own row, and the whole point of a view is that somebody else is looking — so the one
-- caller who must not be counted is the only caller RLS would allow.
--
-- So: security definer, with the rules the client would otherwise have to be trusted with baked
-- in. It counts only published listings, and never counts the seller looking at their own.
create or replace function bump_asset_views(a uuid) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  update assets
     set views = views + 1
   where id = a
     and status = 'PUBLISHED'
     -- The owner reading their own listing is not a view. Without this line a seller could
     -- inflate their own counter by refreshing, which is the first thing anyone would try.
     and seller_id is distinct from auth.uid();
end
$fn$;

-- Definer functions are executable by anyone unless told otherwise, and this one writes.
revoke all on function bump_asset_views(uuid) from public, anon;
grant execute on function bump_asset_views(uuid) to authenticated;

-- The counter has been dead since the seed, so the numbers on screen are a mix of seeded fiction
-- and honest zeros. Zero them all, and let the count mean what it says from here.
update assets set views = 0;
