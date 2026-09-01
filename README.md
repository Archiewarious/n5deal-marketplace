# N5Deal — marketplace prototype

A working marketplace for licensed financial entities: banks, EMIs, payment institutions and
crypto licences, with three sides — **Buyer**, **Seller**, **Platform Manager**.

**Live:** https://n5deal-marketplace-amber.vercel.app · **Sign in with one click**, no typing.

Built as the N5Deal technical test task. Next.js 16 · TypeScript · Supabase (Postgres, Auth, RLS)
· Tailwind v4 · Gemini. 30 listings, 17 jurisdictions, 42 tests.

---

## Run it

```bash
npm install
cp .env.example .env.local     # fill in the two Supabase values
npm run dev                    # http://localhost:3000
```

Two variables are required, both from your Supabase project's API settings. The third is
optional — without it the AI features fall back to deterministic code and nothing breaks:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `GEMINI_API_KEY` | Google AI Studio. Optional |

To build the database from nothing, run the seven files in `supabase/` in order, `01_schema.sql`
through `07_views.sql`, in the Supabase SQL editor. `02_seed.sql` creates the demo accounts and
the listings.

Those seven are the history — how the database got here, including the two access-control holes
that were found live and closed. If the question is just *what are the rules today*, read
**[supabase/CURRENT_STATE.sql](supabase/CURRENT_STATE.sql)** instead: every function, policy,
trigger and index read straight out of the running instance. Why each of them exists is in
[supabase/SECURITY.md](supabase/SECURITY.md).

```bash
npm test              # 42 tests, no framework, node --test
npm run build         # production build
npm run verify:access # proves the access rules against a running deployment
```

---

## Sign in

Every demo account uses the password `demo1234`, and the login screen offers them as buttons.

| Account | Role | Why open it |
|---|---|---|
| `seller.nordic@n5demo.com` | Seller | 16 listings, one a draft only they can see |
| `seller.atlas@n5demo.com` | Seller | The other 16, including one a manager suspended |
| `buyer.harbour@n5demo.com` | Buyer | Has a mandate, so the catalogue is ranked by fit |
| `buyer.meridian@n5demo.com` | Buyer | A different mandate ranks the same catalogue differently |
| `buyer.solace@n5demo.com` | Buyer | **Suspended.** Sees nothing, can send nothing |
| `manager@n5demo.com` | Platform Manager | Sees everything, can suspend anyone |

`/register` also creates real accounts. A few exist already, from testing that it works.

---

## Five minutes, in order

1. **Sign in as Harbour Capital.** The catalogue is ranked by fit with their mandate; each card
   says why in a badge you can check.
2. **Type a sentence into the search box** — *crypto in Estonia under 500k*, or click one of the
   examples under it. A model turns it into filters, the filters land in the URL, and a band above
   the results shows how it read you. Send the link to someone and they get the same view.
3. **Open a listing and message the seller.** It appears in `/messages`, grouped by counterparty.
4. **Switch to Nordic License Partners.** Publish an asset — the buyer's card renders live beside
   the form as you type — and press *Check before publishing* to have a model read your draft back
   to you. Then look at `/buyers`: each mandate says how many of *your* listings clear 60% of it.
5. **Switch to the manager,** open `/admin`, suspend Harbour Capital, and sign back in as them.
   The catalogue is not filtered. It is **empty**. The rows never leave Postgres.

That last one is the thing worth five minutes on its own.

---

## What each role can do, and where

| | Buyer | Seller | Manager |
|---|---|---|---|
| Browse and filter listings | `/assets` | `/assets` | `/assets` |
| State an acquisition mandate | `/buyer/profile` | — | — |
| Publish and edit assets | — | `/seller/assets` | — |
| Browse and filter mandates | — | `/buyers` | `/buyers` |
| Contact the other side | listing page | mandate page | either |
| See everyone and everything | — | — | `/admin` |
| Suspend or remove | — | own listings | anyone, anything |

---

## Key technical decisions

**Access control is in the database, not in the application.** Every table has row level security;
roles come out of Postgres, not out of a JWT claim the client could shape. The interface is a
convenience over rules that hold without it — suspend a buyer and their rows stop existing for
everyone else, no matter which endpoint you ask. Verified by asking the API directly per role,
not by reading policies.

**Columns need triggers, not policies.** RLS filters rows; it cannot stop a seller from setting
`validated: true` on a row they own. Two `BEFORE INSERT OR UPDATE` triggers guard the columns that
decide moderation and the badge. The first version guarded UPDATE only, and a seller could create
a listing already validated — found by trying it, fixed in `03_hardening.sql` and `05_fixes.sql`.

**Filters live in the URL, not in React state.** Every filtered view is shareable and survives a
refresh for free, and the pages stay server components with no client-side fetching.

**Money is `bigint` euro cents,** formatted in exactly one module. No floats anywhere near a price.

**The model is never load-bearing.** Two places earn a model — reading a search sentence, and
reviewing a listing draft — and both fall back to deterministic code on no key, a timeout or a
quota wall. Matching is arithmetic, not a model: it has to be checkable and unit-testable.

**Which model, measured.** The first choice answered 0 of 8 requests in a burst on a free key.
`gemini-3.5-flash-lite` answered 8 of 8. A quota you hit on the second click is indistinguishable
from a feature that does not work.

**Sign-up cannot choose its own role.** The role is sent as metadata and clamped by a trigger:
anything that is not exactly `SELLER` becomes `BUYER`. Asking for `MANAGER` gets you a buyer
account. Checked by asking for it.

**Three languages** (English, Українська, Русский) in a hand-written dictionary with consistency
tests, chosen by cookie rather than by URL segment so every route stays single.

→ The reasoning behind each of these, and the eight decisions not listed here, is in
**[docs/DECISIONS.md](docs/DECISIONS.md)**. The design methodology those choices came out of —
the rule library, and what changed when the interface was measured against it rather than
compared to it — is in **[tools/README.md](tools/README.md)**.

---

## Assumptions

- **A licence is the product, not a company.** Cards lead with the issuing regulator and the
  jurisdiction, because nobody buys "a payment institution" — they buy a German one from BaFin.
- **Demo accounts beat a sign-up form** for a reviewer, so they are the front door. `/register`
  exists and works; it just is not the fast way in.
- **A manager moderates, they do not trade.** No mandate, no listings, and they are a party to no
  conversation — so `/messages` shows them the flat log instead of threads.
- **Nothing is ever hard-deleted through the application.** Suspend and remove are states. No
  table has a DELETE policy.
- **Prices are asking prices in euros.** Currency conversion, offers and negotiation are out of
  scope.
- **Thirty listings fit in memory.** Filtering happens over the fetched set. At a thousand this
  moves into Postgres; the query is already written the way that migration would want.

---

## AI tools used

- **Claude Code** wrote most of this repository, under review. Every non-obvious decision in
  `docs/DECISIONS.md` was argued out rather than accepted, and several were reversed after being
  measured — the model choice, the pagination clamp, the card design.
- **Gemini (`gemini-3.5-flash-lite`)** runs inside the product, in two places: the search box, and
  the pre-publish review of a listing draft. Structured output with a schema, a hard timeout, and
  output guards that distrust the answer.
- **Adversarial review by a second agent** found the two live security holes that a green test
  suite did not: the validated-badge insert, and a suspended buyer's mandate staying visible.

---

## Tests

```bash
npm test
```

42 tests on the node built-in runner, no framework. They cover the parts where being wrong is
silent: price parsing and formatting, the query parser, mandate matching, the pagination clamp,
the price percentile, and dictionary consistency across three languages.

What tests did not catch, and clicking did, is written up in
[docs/DECISIONS.md](docs/DECISIONS.md#the-defect-that-clicking-found-and-the-build-did-not).

### Measured, not assumed

The interface claims are numbers taken off the running page, not intentions:

| Check | Result |
|---|---|
| Text contrast, 23 distinct styles, alpha layers composited | 0 below 4.5:1 |
| Focus ring against every surface it lands on | 5.78:1 dark, 9.15:1 light (needs 3:1) |
| Touch targets at 390px | 0 below 44px |
| Form controls without an accessible name | 0 of 14 |
| Horizontal overflow at 375px | none |
| Access matrix, 10 routes × 5 roles | no route renders data to a role that should not see it |
| Rows readable straight from PostgREST, 4 tables × 5 roles | a suspended account reads 0 listings, not a filtered list |
| Column guards RLS cannot express | a seller cannot set `validated` on insert or on update, or move its own view count |

Two of those failed the first time they were measured — contrast at 4.37:1 on the card's own
labels, and 43 of 49 controls under the touch floor. Both are in the git history rather than
quietly fixed, because the interesting part is that neither was visible while using the app on a
laptop.

The bottom three rows are not a claim, they are a command:

```bash
npm run verify:access                       # against the deployed app
npm run verify:access http://localhost:3000 # or your own
```

It signs in as each demo account, asks for every route, then goes around the application entirely
and asks PostgREST directly with each role's own token — which is what somebody with a stolen
session and `curl` would do. It exits non-zero on the first thing that does not hold.

`npm test`, the typecheck and the build run on every push through GitHub Actions
(`.github/workflows/ci.yml`). The access verification does not: it writes to the live database,
and attaching that to a pull request anyone can open is a worse idea than running it by hand.

---

## What I would do with more time

### Design

The visual language is settled — a listing reads as the instrument it is, issuer and jurisdiction
first, permissions in the middle — but it is one card and one page deep.

- **A design system, not a palette.** The tokens are real and semantic; the components that use
  them have no documented contract. Two people building the next screen would produce two
  interpretations of the same card.
- **Motion that means something.** Today it is entrance animation, which is decoration. The moves
  worth animating are the ones that carry state: a listing leaving the catalogue when it is
  suspended, a filter narrowing the set, a message arriving.
- **The listing page could go further.** It reads as a document now; it could read as *the*
  document — the register entry, with the regulator's own language and a link back to the public
  register the entry comes from.
- **Empty and loading states are handled, not designed.** They are correct and plain. On a
  marketplace with 30 listings that is fine; on one with three in your jurisdiction it is the
  first impression.

### The product, and getting closer to the customer

What is built is the discovery half of a marketplace: find, filter, contact. The half that makes
it a business is missing, and it is the half where the customer actually lives.

- **A deal room.** Right now two parties meet, exchange messages, and take the deal off the
  platform — which is exactly where the platform stops being useful and stops being paid. The
  missing surface is a private room per deal: a document checklist the transaction actually needs
  (the licence, audited accounts, regulatory correspondence, the register extract), per-document
  status, an NDA gate before anything opens, and both sides seeing the same list.
- **A verification desk.** `validated` is one boolean a manager sets. For a seven-figure purchase
  it should be a record: who checked, against which public register, on what date, and when the
  check goes stale. A tick is a claim; an audit trail is a reason to trust the platform.
- **Saved searches and alerts.** The mandate already says precisely what a buyer wants. Nothing
  tells them when it arrives. This is the cheapest retention feature on the list and the most
  obvious one to a buyer who checks back weekly and finds nothing new.
- **Analytics for the seller.** The view counter works now; the useful version answers *which
  mandates match this listing*, *what did comparable licences ask*, and *where does interest drop
  off*. A seller who cannot see why a listing is not moving lowers the price blindly.
- **A fourth side: brokers and advisers.** Real deals in this market run through an adviser acting
  for one side. Today they would have to borrow an account. A delegated role — acting for a named
  client, visible as such to the other party — is a product decision, not a permission tweak.
- **Onboarding per role.** A new account lands in a working product with nothing in it. A buyer
  should be asked for their mandate first, because it is what makes the catalogue useful; a seller
  should be walked into their first listing.
- **Escrow and milestones** are the department after that, and the point at which this stops being
  a prototype and starts needing a lawyer.

### Engineering

- **Unread state for messages.** Needs a `read_at` column. A marketplace where you cannot see what
  is new is not finished.
- **Move filtering into Postgres.** Correct at 30 listings, wrong at 1,000.
- **A real screen-reader pass.** Contrast, focus and touch targets are measured, not assumed — see
  `docs/DECISIONS.md`. Semantics and reading order are reasoned about, and reasoning is not
  testing.
- **An audit trail for moderation.** Who suspended whom, when, and why. Today the state changes
  and the reason does not survive.
- **End-to-end tests for the role matrix.** It is verified by a script per release; it should be
  verified by CI on every commit.
