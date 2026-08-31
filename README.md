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

Two variables are required and one is optional:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GEMINI_API_KEY=...        # optional
```

Without `GEMINI_API_KEY` the app runs completely: the search box falls back to its
deterministic parser and the "Check before publishing" button does not appear. Nothing else
changes, and that is deliberate — see *Where a model earns its keep* below.

To recreate the database from scratch, run the four SQL files in order in the Supabase SQL
editor: `supabase/01_schema.sql` builds the tables, enums, indexes and RLS policies;
`supabase/02_seed.sql` creates six demo accounts, thirty listings and one conversation;
`supabase/03_hardening.sql` closes the holes an audit found in the first file — it is not
optional, and it explains each one; `supabase/04_public_stats.sql` adds the one function an
anonymous visitor may call, so the landing page can say how big the platform is without any
table being readable without a session.

### Demo accounts

All of them use the password `demo1234`, and the login screen offers them as buttons, so
there is nothing to type.

| Account | Role | Why it is worth opening |
|---|---|---|
| `seller.nordic@n5demo.com` | Seller | Owns 16 listings, one of them a draft only they can see |
| `seller.atlas@n5demo.com` | Seller | Owns the other 16, including one a manager suspended |
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

What that buys, counted against the live database rather than read off the policies:

| Role | Published visible | Total rows visible |
|---|---|---|
| Buyer | 29 | 29 |
| Seller (Nordic) | 29 | **30** — plus their own draft |
| Seller (Atlas) | 29 | **31** — plus their own draft and their own suspended listing |
| Platform Manager | 29 | **32** — everything, including another seller's draft |
| Suspended buyer | **0** | **0** |
| Anonymous | **0** | **0** |

These numbers have been wrong twice, both times because they were written once and not re-run:
first when the catalogue grew from 16 listings to 30, and again when a second audit left probe
rows in the table and the totals were re-derived over them. `supabase/05_fixes.sql` ends with
the two counts as a query, so the table can be checked instead of believed.

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

### Where a model earns its keep, and where it does not

Two of the three places language shows up here are answered by rules, and one is answered by a
model. The split is not a preference, it is about what each is good for.

**Matching is arithmetic.** `src/lib/matching.ts` scores a listing against a buyer's mandate on
three axes — sector, jurisdiction, ticket range — and returns the reasons alongside the number,
because a buyer will not act on a percentage they cannot check. Both sides are already
structured, so there is no language to understand: sending them to a model would make a
deterministic, unit-testable comparison non-deterministic, per-row expensive, and impossible to
assert on.

**The search box is language, so it gets a model.** `src/lib/parseQuery.ts` is a deterministic
parser over a closed vocabulary and it handles what it was built for — *crypto licence in Poland
under 500k* becomes a sector, a country and a ceiling. It cannot handle *a bank in Switzerland, I
have eight figures*, which resolves to sector Bank, jurisdiction Switzerland and a floor of €10M.
No parser gets from "eight figures" to a price floor.

So `src/lib/ai.ts` sits on top and the parser stays underneath as the floor. **Nothing about the
model is load-bearing**: with no `GEMINI_API_KEY`, with a timeout, with a quota wall, the box
falls back to the parser, and a reviewer who cloned this repo without a key should not notice.

The budget is 14 seconds, and that number is measurement rather than taste: the same query
came back in 4.3s, 8.4s and 12.4s on three consecutive tries against this free key. A 6s budget
worked in development and threw the answer away in production, which is the worst of both — you
pay for the call and discard it. The button reads "Reading…" for the duration, because the
honest move is to show the wait rather than hide it behind an early abort.

The call happens once, when the box is submitted — not inside the catalogue's render. The first
version did it in the server component and that was wrong in a way worth recording: every render
of a searched catalogue paid two seconds, including the back button and every filter chip, and a
render that overran the abort budget lost the answer silently. Measured at 6.8s against a 6s
timeout, which is the worst of both. Resolving on submit also puts the resolved filters in the
URL, so a shared search carries what was understood rather than a sentence the next reader's
model might read differently.

**Everything the model returns is distrusted on the way out.** The prompt is a request; only the
schema is enforced. Both output guards fired on the first query tried: asked for a label of at
most eight words it returned a paragraph about MiCA, and asked for at most two distinctive words
it echoed the entire query, which would then have been applied as a literal substring match and
returned an empty catalogue. A hostile query can therefore do nothing worse than produce a wrong
filter — which the "Read as" line shows back, and a Clear link undoes.

**The second feature is validation.** A seller fills in twelve structured fields and a paragraph
of prose, and the two can disagree — expensively in one direction, because buyers filter on the
structured half and read the prose half. `reviewListing` reads a draft before it goes live and
reports contradictions and gaps. On a deliberately inconsistent draft it caught the licence type
against the description, the sector against the description, and "twelve staff in Tallinn"
against an empty Employees field; on a consistent one it returns nothing. It is advisory and
behind a button: nothing blocks a publish, because a validator that refuses to save is one
people learn to work around.

Two things that version got wrong, both found by running it. It invented a "Passporting" field
that has never existed on the form, so the prompt now lists the twelve real ones and anything
else is dropped on the way out. And a failed call returned an empty list, which the interface
rendered as the green "nothing to flag" — a timeout claiming a listing is clean is worse than no
check at all, so `null` and `[]` are now different answers and the interface says so
differently.

The key is server-side only. `src/lib/ai.ts` opens with `import 'server-only'`, which turns a
leak into a build failure rather than a shipped secret.

### Three languages, in a cookie rather than in the path

English, Ukrainian and Russian. The machinery is one file: a flat record per locale, a lookup
that falls back to English rather than to a raw key, and `{name}` interpolation. next-intl and
react-i18next both solve routing, plural rules and lazy namespace loading, none of which is a
problem at this size.

The locale lives in a cookie, and that is a trade rather than a shortcut. `/uk/assets` is the
right answer for a public catalogue, because a URL that names its language is shareable and
indexable — but eleven of twelve routes sit behind auth and the whole site is `robots: noindex`,
so a path segment buys nothing and costs a rewrite of every internal href. If the catalogue were
ever made public that flips, and the dictionary would not change for it.

**The listings themselves are not translated.** A licence written up in English by its seller
stays in English: machine-translating the description of a regulated entity into a language the
seller cannot check is worse than leaving it alone. That is a content problem, not a UI one.

Eight tests hold the dictionary together, because three hand-written objects are the easiest
thing here to let rot. They check that every locale defines every key, that none defines one
English does not, that no translation was left identical to the English by accident, and that
`{n}` appears in all three versions of a sentence or none — a translation that drops a
placeholder renders a hole, and one that renames it renders `{count}` to a user.

### One typeface family, and why the fonts were crooked

Both fonts were loaded with `subsets: ['latin']`. Cyrillic was therefore not in the webfont at
all, and every Ukrainian and Russian character fell through to the system fallback — so a
Cyrillic heading rendered in Segoe UI beside Latin words in Inter, on the same line. Two
typefaces in one sentence, which is what "the fonts look crooked" turned out to be.

The repair is a better answer than the bug required. Every number, asset id and jurisdiction code
in this interface is set in IBM Plex Mono, and Inter beside it is two unrelated families sharing
a page: different proportions, a different weight axis, a different Cyrillic. The sans is now
**IBM Plex Sans**, drawn with that mono as one superfamily, so a label and the figure beside it
belong to each other.

That pairing is not taste either. `.claude/skills/ui-ux-pro-max` — carried over from another
project of the owner's — has a table of 57 font pairings, and row 31 is "Financial Trust: IBM
Plex Sans. Banks, finance, insurance, investment, fintech, enterprise. Excellent for data." The
skills are committed under `.claude/` with a README saying which one did what.

### The catalogue is paged, eight to a view

The listing card is deliberately a full specification — ten label/value rows, two panels and a
chart — because that is the shape the reference site uses and it is right for the material.
Thirty of them stacked is about thirty thousand pixels of scrolling, which is not.

The reference site holds 137 listings and pages them for exactly this reason. The answer is fewer
cards at a time, not a smaller card. The page number lives in the URL beside the filters, so page
three of a filtered search is a link you can send, and the component stays a server component
with no state to fall out of sync. `?page=0` and `?page=999` are clamped rather than trusted.

### One typeface family, and why the fonts were crooked

Both fonts were loaded with `subsets: ['latin']`. Cyrillic was therefore not in the webfont at
all, and every Ukrainian and Russian character fell through to the system fallback — so a
Cyrillic heading rendered in Segoe UI beside Latin words in Inter, on the same line. Two
typefaces in one sentence, which is what "the fonts look crooked" turned out to be.

The repair is a better answer than the bug required. Every number, asset id and jurisdiction code
in this interface is set in IBM Plex Mono, and Inter beside it is two unrelated families sharing
a page: different proportions, a different weight axis, a different Cyrillic. The sans is now
**IBM Plex Sans**, drawn with that mono as one superfamily, so a label and the figure beside it
belong to each other.

That pairing is not taste either. `.claude/skills/ui-ux-pro-max` — carried over from another
project of the owner's — has a table of 57 font pairings, and row 31 is "Financial Trust: IBM
Plex Sans. Banks, finance, insurance, investment, fintech, enterprise. Excellent for data." The
skills are committed under `.claude/` with a README saying which one did what.

### The catalogue is paged, eight to a view

The listing card is deliberately a full specification — ten label/value rows, two panels and a
chart — because that is the shape the reference site uses and it is right for the material.
Thirty of them stacked is about thirty thousand pixels of scrolling, which is not.

The reference site holds 137 listings and pages them for exactly this reason. The answer is fewer
cards at a time, not a smaller card. The page number lives in the URL beside the filters, so page
three of a filtered search is a link you can send, and the component stays a server component
with no state to fall out of sync. `?page=0` and `?page=999` are clamped rather than trusted.

### Two themes, light by default

N5Deal runs on white and the assignment names visual consistency with them as a criterion, so
light is the default and it is the one that matches. Dark is not a filter over it: on a light
ground the accent has to be dark enough to carry text, on a dark ground light enough, so both
palettes are written out rather than derived.

Three states, not two. Bare `:root` is light; `prefers-color-scheme` flips it for anyone whose
system is dark and who has not chosen; `[data-theme]` beats both in either direction so the
toggle always wins. The choice is read back by an inline script before first paint, so someone
who picked dark never watches the light page flash past.

Every colour is measured against its own ground rather than eyeballed. The smallest labels are
10px, so 4.5:1 is the floor, and `globals.css` records the ratio beside the values that sit near
it — `#767d89` was rejected at 3.8:1 before `#666d78` passed at 4.8:1.

The five sectors get five hues, and that is the one place colour is allowed to multiply: category
is the first thing a buyer narrows on, and across thirty cards a chip you can find by colour
beats a word you have to read. The colour is never the only carrier — the sector is always named
in text beside it.


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

Thirty tests over four pure modules — `parseQuery`, `format`, `matching` and `i18n` — on
Node's built-in test runner. No framework, no dependency: the whole suite is `node --test`,
which is why `.ts` extensions appear in the internal imports.

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
  thirty listings, wrong for thirty thousand — the filters map cleanly onto PostgREST query
  parameters, and the pagination helper is already there.
- **Optimistic updates.** Suspend and publish wait for a round trip and then `router.refresh()`.
  Fine at this scale, visibly slow on a long admin table.
- **Unread state on messages.** Messages are grouped into conversations with a reply box, but
  `contact_requests` has no `read_at`, so nothing distinguishes a new message from one already
  seen. It needs a column plus a policy letting only the recipient set it.

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
