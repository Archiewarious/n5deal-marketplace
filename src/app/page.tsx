import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPriceFull } from '@/lib/format'
import { countryCode, countryFlag } from '@/lib/flags'
import { RoleCards } from '@/components/RoleCards'

export const metadata = {
  title: 'Licensed financial assets, sold with the paperwork attached',
}

type Stats = {
  listings: number
  jurisdictions: number
  participants: number
  value_cents: number
  by_country: { country: string; n: number }[]
  by_sector: { sector: string; n: number }[]
}

export default async function Home() {
  // The one call an anonymous visitor may make. `platform_stats` is a security definer function
  // returning aggregates and nothing else (see supabase/04_public_stats.sql): the tables behind
  // it stay closed, because the audit found the participant directory readable by anyone holding
  // the publishable key. If the function is not deployed the page still renders; the register
  // simply has nothing to count, which is better than a crash on the front page.
  const supabase = await createClient()
  const { data } = await supabase.rpc('platform_stats')
  const stats = (data as Stats | null) ?? null

  const sectorMax = Math.max(1, ...(stats?.by_sector ?? []).map((s) => s.n))

  return (
    <main className="flex-1">
      {/* ── The register ─────────────────────────────────────────────────────────
          A licence is a document with a jurisdiction, a regulator and a number, and the trade in
          them runs off a register. So the page opens as one rather than as a headline over a
          hero image: mono column heads, hairline rules, the actual inventory underneath. Every
          figure comes from the database. */}
      <section className="relative overflow-hidden border-b px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(1000px 520px at 15% -12%, rgba(56,59,254,.20), transparent 62%),' +
              'radial-gradient(760px 460px at 88% 0%, rgba(52,211,153,.09), transparent 58%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <p className="rise flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            <span className="size-1.5 rounded-full bg-seller" />
            Licence register
          </p>

          <h1
            className="rise mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            Banking and fintech businesses,
            <br className="hidden sm:block" /> sold with the{' '}
            <span className="text-accent-text">licence attached</span>.
          </h1>

          <p
            className="rise mt-6 max-w-2xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: '120ms' }}
          >
            Buyers state a mandate once. Sellers list an entity. The catalogue ranks one against
            the other, so nobody reads every listing to find the three that fit.
          </p>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href="/login"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              Enter the demo
            </Link>
            <a
              href="https://github.com/Archiewarious/n5deal-marketplace"
              className="rounded-full border px-6 py-2.5 text-sm text-muted transition hover:text-fg"
            >
              Read the source
            </a>
          </div>

          {/* The inventory as a shape. Country codes in mono because that is how a register
              writes a jurisdiction, and because a column of them lines up. */}
          {stats && stats.by_country.length > 0 && (
            <div
              className="rise mt-14 overflow-hidden rounded-2xl border bg-surface/70 backdrop-blur"
              style={{ animationDelay: '240ms' }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
                  On the platform now
                </p>
                <p className="font-mono text-[11px] text-faint">counted on every read</p>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { k: 'Listings', v: String(stats.listings) },
                  { k: 'Jurisdictions', v: String(stats.jurisdictions) },
                  { k: 'Participants', v: String(stats.participants) },
                  { k: 'Value listed', v: formatPriceFull(stats.value_cents) },
                ].map((s) => (
                  <div key={s.k} className="border-b px-5 py-4 sm:border-b-0 sm:not-first:border-l">
                    <dt className="text-[10px] uppercase tracking-wider text-faint">{s.k}</dt>
                    <dd className="mt-1 font-mono text-2xl font-medium tabular-nums">{s.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-5 py-4">
                {stats.by_country.map((c) => (
                  <span key={c.country} className="flex items-center gap-1.5 text-sm">
                    <span aria-hidden>{countryFlag(c.country)}</span>
                    <span className="font-mono text-muted" title={c.country}>
                      {countryCode(c.country)}
                    </span>
                    <span className="font-mono tabular-nums text-faint">{c.n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── What is in it ───────────────────────────────────────────────────────── */}
      {stats && stats.by_sector.length > 0 && (
        <section className="border-b px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">What is on the shelf</h2>
              <p className="mt-3 max-w-md leading-relaxed text-muted">
                Five categories, from a dormant VASP to a bank at eight figures. The split beside
                this is the live count per category, not an illustration.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-text transition-all hover:gap-2.5"
              >
                Browse the catalogue <span aria-hidden>→</span>
              </Link>
            </div>

            <ul className="space-y-3">
              {stats.by_sector.map((s, i) => (
                <li key={s.sector} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3">
                  <span className="truncate text-sm">{s.sector}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-field">
                    <span
                      className="block h-full rounded-full bg-accent-text"
                      style={{ width: `${(s.n / sectorMax) * 100}%`, opacity: 1 - i * 0.13 }}
                    />
                  </span>
                  <span className="text-right font-mono text-sm tabular-nums text-muted">
                    {s.n}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── The three sides ─────────────────────────────────────────────────────── */}
      <section className="border-b px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Three sides, three different screens
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            The same catalogue looks different depending on who is holding it, and not as a matter
            of styling: each role reaches a different set of rows.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-line md:grid-cols-3">
            {[
              {
                tone: 'text-seller',
                title: 'A seller',
                sees: 'Their own listings including drafts, plus every published listing.',
                does: 'Publishes an entity, reads what buyers are looking for, writes to one directly.',
              },
              {
                tone: 'text-buyer',
                title: 'A buyer',
                sees: 'Published listings only, ordered by how well each fits their mandate.',
                does: 'States a mandate once, then lets the catalogue do the shortlisting.',
              },
              {
                tone: 'text-manager',
                title: 'A platform manager',
                sees: 'Everything. Drafts, removed listings, every participant, every message.',
                does: 'Suspends an account or takes a listing down, and both take effect in the database.',
              },
            ].map((c) => (
              <div key={c.title} className="bg-surface p-6">
                <p className={`font-mono text-xs uppercase tracking-[0.16em] ${c.tone}`}>
                  {c.title}
                </p>
                <p className="mt-4 text-sm leading-relaxed">
                  <span className="text-faint">Sees </span>
                  <span className="text-muted">{c.sees}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="text-faint">Does </span>
                  <span className="text-muted">{c.does}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why the boundary holds ──────────────────────────────────────────────── */}
      <section className="border-b px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              The rules live in the database
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Not in a route guard, and not in a hidden button. Every read and every write goes
              through row level security in Postgres, so a request that skips this interface
              entirely gets the same answer.
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              That claim was tested rather than asserted. Attacking the first version of the
              policies found six holes, one of which let any account promote itself to platform
              manager, because RLS restricts rows and never columns. All six are written up with
              the request that proved each one.
            </p>
            <a
              href="https://github.com/Archiewarious/n5deal-marketplace/blob/master/supabase/SECURITY.md"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-text transition-all hover:gap-2.5"
            >
              Read the audit <span aria-hidden>→</span>
            </a>
          </div>

          <ul className="grid gap-px overflow-hidden rounded-2xl border bg-line">
            {[
              ['Suspended account', 'sees zero rows, and cannot write one'],
              ['Suspended seller', 'their live listings leave the catalogue with them'],
              ['Suspended manager', 'loses the console; holding the role is not enough'],
              ['Any account', 'cannot rewrite its own role or status'],
              ['Any seller', 'cannot award itself the validated badge'],
              ['Buyer mandates', 'visible to sellers and managers, nobody else'],
            ].map(([who, what]) => (
              <li key={who} className="flex flex-wrap gap-x-2 bg-surface px-5 py-3.5 text-sm">
                <span className="font-mono text-faint">{who}</span>
                <span className="text-muted">{what}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Enter ───────────────────────────────────────────────────────────────── */}
      <section id="roles" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-9 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pick the side you are on
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Three seeded accounts, no sign-up. Each one drops you straight into that role.
            </p>
          </div>

          <RoleCards showExtras={false} />

          <p className="mt-8 text-center text-sm text-muted">
            There is a fourth account, suspended, on the{' '}
            <Link href="/login" className="text-accent-text hover:underline">
              role picker
            </Link>{' '}
            — worth a click if you want to see what a blocked participant gets.
          </p>
        </div>
      </section>
    </main>
  )
}
