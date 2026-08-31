# N5Deal — marketplace prototype

A working prototype of a marketplace for M&A opportunities and licensed financial assets,
built as a technical assignment. Three roles — Buyer, Seller, Platform Manager — each with a
different view of the same data.

**Live demo:** https://n5deal-marketplace-amber.vercel.app
**Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · Tailwind v4

---

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

The app expects two variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

To recreate the database from scratch, run the four SQL files in order in the Supabase SQL
editor: `supabase/01_schema.sql` builds the tables, enums, indexes and RLS policies;
`supabase/02_seed.sql` creates six demo accounts, sixteen listings and one conversation;
`supabase/03_hardening.sql` closes the holes an audit found in the first file — it is not
optional, and it explains each one; `supabase/04_public_stats.sql` adds the one function an
anonymous visitor may call, so the landing page can say how big the platform is without any
table being readable without a session.

### Demo accounts

All of them use the password `demo1234`, and the login screen offers them as buttons, so
there is nothing to type.

| Account | Role | Why it is worth opening |
|---|---|---|
| `seller.nordic@n5demo.com` | Seller | Owns eight listings, one of them a draft only they can see |
| `seller.atlas@n5demo.com` | Seller | Owns the rest, including a listing a manager suspended |
| `buyer.harbour@n5demo.com` | Buyer | Has a mandate, so the catalogue is sorted by fit |
| `buyer.meridian@n5demo.com` | Buyer | A different mandate — the same catalogue ranks differently |
| `buyer.solace@n5demo.com` | Buyer | **Suspended.** Sees nothing and can send nothing |
| `manager@n5demo.com` | Platform Manager | Sees every listing including drafts, can suspend anyone |

### Where to click

- **/** is public and needs no account. It says what the platform is, and the four figures on it
  are live — see the note on `platform_stats` below for why an anonymous visitor can read them
  while the tables stay closed.
- **/assets** is the catalogue. As a buyer it is ordered by fit with your mandate; the badge on
  each card says why. Every card plots its own price against comparable listings.
- **/seller/assets** is a seller's own listings including their draft, with Edit and
  Publish/Unpublish. The editor renders the buyer's card live beside the form.
- **/buyers** is the mandate directory. As a seller each card says how many of your own listings
  clear 60% against that mandate.
- **/admin** is the moderation console: every participant and every listing, drafts and removed
  ones included, with suspend and remove behind a confirmation.
- **/messages** groups messages into conversations with a reply at the end of each. A manager
  sees the flat log instead, because they are a party to none of them.

The most interesting thing to try is the **suspended buyer**. Sign in as
`buyer.solace@n5demo.com` and the catalogue is empty — not filtered, empty. The rows never
leave Postgres.

---

## Key technical decisions

### Access control lives in the database, not in the application

Every rule about who may see or change what is a Postgres RLS policy. The API layer cannot
widen them, and neither can a mistake in a React component.

This is why the prototype uses real Supabase Auth rather than a "current user" cookie. A fake
session would have been faster to write, but RLS needs a genuine `auth.uid()`; with a fake one
the database would have been wide open and the access model would have been theatre in the UI.

What that buys, verified with four accounts against the live database:

| Role | Published listings visible | Total rows visible |
|---|---|---|
| Buyer | 14 | 14 |
| Seller (Nordic) | 14 | **15** — plus their own draft |
| Platform Manager | 14 | **16** — everything, including another seller's draft |
| Suspended buyer | **0** | **0** |

The suspended account is the interesting row. Suspension is not a hidden button: the
`is_active_user()` check sits inside the read policy, so the rows never leave Postgres.

Two `security definer` helpers, `current_role_of()` and `is_active_user()`, let a policy read
`profiles` without recursing into that table's own policy.

### …and the first version of it did not hold

The paragraph above is what I believed after writing the policies and reading them back. It was
wrong, and reading them again would never have shown it — attacking them did.

RLS restricts rows, never columns. `profiles_update_self` checked `id = auth.uid()` and nothing
else, and Supabase grants `authenticated` UPDATE on every column by default, so the owner of a
row could rewrite their own `role` and `status`. Reproduced against the live database with the
publishable key that already ships in the browser bundle: a suspended buyer lifted their own
suspension and became a platform manager, going from 0 visible listings to all 16 — with the
admin console, other sellers' drafts and the whole message history behind it.

Four more of the same shape came out of the same pass, and two of my first fixes were
themselves wrong. **[supabase/SECURITY.md](supabase/SECURITY.md)** documents all of it: each
hole, how it was demonstrated, what closed it, and the numbers after.

The honest version of the claim above is therefore narrower: access control lives in the
database, and it took an audit and a set of live exploits to make that true rather than
aspirational.

### The landing page reads four numbers out of a closed database

The tables are shut to anonymous callers: `03_hardening.sql` narrowed `profiles` and
`buyer_profiles` after the audit found the participant directory, with email addresses and
buyer budgets, readable by anyone holding the publishable key. But a marketplace that cannot say
how big it is has nothing to put on a front page.

So `platform_stats()` returns the counts rather than the rows. It is `security definer`, which
is the sort of thing that deserves an explicit account of what it can leak: four aggregates over
published listings and active participants, plus a count per country and per sector. No id, no
title, no email, no price of any single listing. `set search_path = public` is not decoration on
a definer function — without it a caller can point `assets` at a table of their own and have the
owner's rights execute against it.

Verified from a terminal with nothing but the publishable key: the function answers, and
`profiles`, `assets` and `buyer_profiles` all return `[]`.

### Money is stored as whole euro cents

`asking_price_cents bigint`. Prices are formatted in exactly one module
(`src/lib/format.ts`) and parsed in the same place, so the catalogue, the asset page and the
price filter cannot drift apart by a rounding step. The listing form accepts what people
actually type — `2.5M`, `400K`, `1 200 000` — and echoes back the parsed value before saving,
so a typo is caught before a buyer sees the wrong number.

### Filter state lives in the URL

Every filtered view is shareable and survives a refresh, and the catalogue stays a server
component reading `searchParams` — there is no client-side data fetching anywhere in the app.

### Paginated reads

`src/lib/fetchAllRows.ts` reads in pages, two at a time.

PostgREST truncates every read at the project's "Max rows" ceiling — and does it *without an
error*, as an ordinary successful response that is simply shorter. `.range(0, N)` does not
bypass it. This prototype is nowhere near the ceiling, but a marketplace catalogue is exactly
the kind of set that grows past it, and the failure is silent: the code sees an array, does
not see the missing tail, and quietly computes on partial data.

`src/lib/supabase/rowCap.ts` is the other half — a custom `fetch` that watches the
`Content-Range` header and warns when a response comes back at exactly the ceiling. It is
diagnostics, not a fix: it tells you where to put `fetchAllRows`.

Both are carried over from a production system where this went unnoticed for three months and
was treated five times as five separate page bugs before anyone asked what was creating the
symptom.

### Session checks avoid a network round trip

Middleware runs on every route, so `getUser()` — a network call to Supabase Auth — would add
100–200 ms to every single click. `getClaims()` verifies the JWT signature locally with the
project's public key instead. The authenticity guarantee is the same; the one difference is
that a revoked session stops being accepted within the access token's lifetime rather than
instantly, which does not weaken data access, because PostgREST validates only signature and
expiry anyway. Role changes still apply immediately, since RLS reads `profiles.role` live.

### Matching is rules, not a model

`src/lib/matching.ts` scores a listing against a buyer's mandate on three axes — sector,
jurisdiction, ticket range — and returns the reasons alongside the number, because a buyer
will not act on a percentage they cannot check.

The obvious alternative is to send both to an LLM and ask whether they fit. It demos well and
fails as a product: it needs an API key the reviewer does not have, costs money per row, is
non-deterministic, and cannot be unit tested. Every input here is already structured, so the
comparison is arithmetic, not language.

The free-text search box (`src/lib/parseQuery.ts`) is where language genuinely has to be
understood — `crypto licence in poland under 500k` becomes a sector, a country and a price
ceiling. It is a deterministic parser for the same reason: a search box that silently fails
without an API key is worse than no search box. The vocabulary is closed — five sectors, a
known list of jurisdictions, a few price phrasings — so a parser covers it. If it grew
open-ended, this is the first function to hand to a model, keeping the parser as the offline
fallback.

---

## Assumptions

- **Contacting the other side is a message, not a chat.** The assignment says "contact a
  Buyer" and "contact a Seller"; a threaded conversation is a bigger product with read state,
  notifications and moderation. One `contact_requests` row per message covers the flow and
  keeps the manager's oversight view honest.
- **A manager suspends rather than deletes.** "Remove or suspend participants" is implemented
  as a status flip, so listings, mandates and message history survive and the account can be
  restored. Hard deletion of a participant with live listings is a data-integrity question
  that deserves a real decision, not a prototype's guess.
- **Sellers are trusted with their own listings.** There is no publishing approval queue;
  `validated` is a flag the platform sets, and a manager can suspend anything after the fact.
- **One currency.** Every price is in euros, as on the reference site. Multi-currency means
  rate storage and a chosen conversion date, which is a separate design problem.
- **Views are a stored counter, not analytics.** The field exists and is displayed; it is not
  incremented, because doing that honestly needs deduplication the assignment does not ask for.

---

## AI tools used

Claude Code wrote most of this code, with me directing the design and checking the output.
The division was: I decided the data model, the access-control approach and what to leave out;
Claude wrote the implementation; I verified every piece against the running system rather than
against the fact that it compiled.

That verification is the part worth naming. A type check and a green build say a program is
well-formed, not that it is right — the RLS table above exists because I signed in as four
different accounts and counted the rows each one actually receives, not because the policies
looked correct in the editor.

---

## Tests

```bash
npm test
```

Nineteen tests over the three pure modules — `parseQuery`, `format`, `matching` — run on Node's
built-in test runner. No framework, no dependency: the whole suite is `node --test`, which is why
`.ts` extensions appear in the internal imports.

They cover the parts where being wrong is silent rather than loud: price parsing that must return
`null` instead of `0` for junk, boundary prices that sit exactly on a mandate's limit, an empty
mandate axis that has to match everything rather than nothing, and the weighting of each match
axis. One of them is a regression test — see below.

## The defect that clicking found and the build did not

The placeholder in the search box reads *crypto licence in Poland under 500k*. Typing exactly
that returned **zero results**, while a Polish VASP at €220K sat in the catalogue matching all
three axes.

The parser had done its job: sector `Crypto`, country `Poland`, ceiling €500K. The leftover word
`licence` then became a hard AND against the listing text, and that word appears nowhere in that
listing. So the first thing a reviewer would do — type the suggested query — produced an empty
screen.

Two changes, both in the repo:

- category nouns (`licence`, `asset`, `business`, `company`, …) are now noise, because they name
  the thing being searched rather than narrowing it;
- leftover words are a refinement, not a requirement. If they would empty a result set that the
  structured half of the same query found, they are dropped and the user is told why.

The same pass caught a second one: a price the parser cannot read — `abc` in the max-price field —
used to be discarded silently, so the catalogue showed everything while the user believed a cap
was applied. It now says so.

Neither was visible to `tsc` or to a green production build. Both took one minute of actually
using the thing.

---

## What I would do with more time

- **Server-side filtering.** The catalogue filters in memory after a full read. Correct for
  sixteen listings, wrong for sixteen thousand — the filters map cleanly onto PostgREST query
  parameters, and the pagination helper is already there.
- **Optimistic updates.** Suspend and publish wait for a round trip and then `router.refresh()`.
  Fine at this scale, visibly slow on a long admin table.
- **Unread state on messages.** Messages are grouped into conversations with a reply box, but
  `contact_requests` has no `read_at`, so nothing distinguishes a new message from one already
  seen. It needs a column plus a policy letting only the recipient set it.
- **Multi-language support.** Listed as a Plus in the assignment and deliberately skipped: the
  copy is the smaller half, and doing it honestly means locale-aware price and date formatting
  in `src/lib/format.ts` plus a decision about which language a listing itself is written in —
  a content problem rather than a UI one.
- **Accessibility.** There is a skip link, every `<main>` is a landmark, every control has an
  accessible name, and the strings that appear without a navigation — "Message sent", "Saved",
  form errors, the catalogue count — announce themselves. Contrast is measured against the
  ground rather than guessed: the smallest labels are 11px, so 4.5:1 is the floor and
  `globals.css` records the ratio next to each value. What has NOT happened is a real screen
  reader run or a keyboard-only pass over every flow.

- **Deleting a listing.** Nothing is ever deleted from this database, by anybody: there is no
  delete policy on any table. Withdrawal is Unpublish, which takes a listing off the market and
  keeps the record. That is a deliberate choice for a marketplace in regulated assets rather
  than a missing feature, but it is worth naming.
