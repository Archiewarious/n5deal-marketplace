-- ── Accounts created while testing registration ──────────────────────────────
--
-- Proving that sign-up works means signing up, and there is no way to do that without leaving
-- real rows behind. Five of them: one from before the trigger existed (which is what the backfill
-- in 06_signup.sql picked up), three from checking that the role clamp holds, and one from the
-- form itself.
--
-- The clamp check is the one worth keeping the result of rather than the row: a sign-up asking
-- for role MANAGER came back as an ordinary BUYER, which is the whole point of building the
-- profile in a trigger instead of a policy.
--
-- profiles.id references auth.users on delete cascade, so removing the auth user removes the
-- profile with it. None of these five owns a listing, a mandate or a message, so nothing else
-- follows them out.
delete from auth.users
 where email in (
   'probe.signup.0901@gmail.com',
   'check.trigger.0901@gmail.com',
   'check.trigger.b0901@gmail.com',
   'check.clamp.0901@gmail.com',
   'uiform.check.0901@gmail.com'
 );

-- Back to the six seeded accounts a reviewer is meant to see.
select role, status, count(*) from profiles group by role, status order by role;
