# What the audit found, and how each hole was closed

The README claims that access control lives in the database. That was aspirational when the
policies were first written: reading them back showed nothing wrong, and attacking them showed
five holes, one of which defeated the single requirement of the assignment that has to hold.

Everything below was reproduced against the live database with the publishable key that
already ships in the browser bundle — no privileged credential, nothing a reviewer could not
do from the console of the deployed site.

---

## 1. Any user could promote themselves to platform manager

**Blocker.** `profiles_update_self` checked `id = auth.uid()` and nothing else. RLS in Postgres
restricts which *rows* a statement may touch, never which *columns*, and Supabase grants
`authenticated` UPDATE on every column by default. So the owner of a row could rewrite their
own `role` and `status`.

```
before        role BUYER    status SUSPENDED    listings visible 0
PATCH /rest/v1/profiles?id=eq.<self>  {"status":"ACTIVE"}   → 200
PATCH /rest/v1/profiles?id=eq.<self>  {"role":"MANAGER"}    → 200
after         role MANAGER  status ACTIVE       listings visible 16
```

A suspended account lifted its own suspension. Any buyer became a platform manager, with the
admin console, other sellers' drafts and the platform's whole message history behind it.

**Fix:** a `before update` trigger that restores `role` and `status` for anyone who is not an
active manager. A column-level `GRANT` would have been the wrong instrument — a manager
reaches PostgREST as the same `authenticated` role, so revoking UPDATE on `status` would have
disarmed the suspend button as well.

## 2. A seller could undo moderation and self-award the Validated badge

**Blocker.** `assets_update_own` allowed any change to one's own row, including moving a
listing back out of `SUSPENDED` or `REMOVED` after a manager had put it there, and setting
`validated = true`.

**Fix:** an `assets_guard` trigger pinning `validated`, refusing to move a row out of a
moderated state, and restricting sellers to `DRAFT` and `PUBLISHED`.

## 3. A suspended account kept full write access

**Blocker.** Suspension gated reads but not writes: `assets_update_own` and `buyer_write` never
checked `is_active_user()`, so a suspended seller could publish drafts and edit live listings.

**Fix:** `is_active_user()` added to both policies, in `using` and in `with check`.

## 4. A suspended manager stayed omnipotent

**Major.** Every manager branch keyed on `current_role_of() = 'MANAGER'`, and suspension does
not strip a role. Verified: the suspended manager still read all 16 listings.

**Fix:** `and is_active_user()` in all four manager branches.

## 5. Suspending a seller left their listings selling

**Major.** The seller lost their own access while their published listings stayed in the
catalogue for every buyer.

**Fix:** `assets_read` now requires the seller's own profile to be `ACTIVE`. Verified:
suspending one demo seller drops a buyer from 14 visible listings to 7; restoring puts it back
to 14.

## 6. The participant directory was public to any session

**Major.** `profiles_read` and `buyer_read` were `using (true)`. Email addresses and every
buyer's stated budget were readable by a suspended account, and by a stranger who signed
themselves up through the public key and never had a profile at all.

**Fix:** both narrowed to active participants, with mandates visible only to sellers and
managers — the two roles that have a reason to read them.

---

## Two fixes that were themselves wrong

Worth recording, because both passed review and failed testing.

**Checking the role instead of the state.** The first guard asked
`current_role_of() = 'MANAGER'`. A suspended manager still holds the MANAGER role, so they
lifted their own suspension — the same hole as №1, one level up. The condition has to be an
*active* manager.

**Locking out the database owner.** The corrected trigger then reverted statements from the
SQL editor too, because those have no `auth.uid()` — and that is precisely the path by which a
locked-out manager has to be restored. It now exempts callers that are not application users:
`auth.uid() is null` means the caller is the database owner, who is trusted by definition.

---

## State after the fixes

Every exploit above returns the row unchanged. The ordinary numbers are untouched:

| Role | Listings visible |
|---|---|
| Platform manager | 33 — everything, drafts and removed rows included |
| Seller | 31 — the 29 published, plus their own draft and their own moderated row |
| Buyer | 29 |
| Suspended buyer | 0 |

Counted again after the catalogue grew from 16 listings to 33. The numbers in a security
write-up are only worth having if they are re-run when the data changes; these were.
