import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { TopNav } from '@/components/TopNav'
import { BuyerFilters } from '@/components/BuyerFilters'
import type { BuyerProfile, Profile } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'

export const metadata = { title: 'Buyer mandates' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function BuyersPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole('SELLER', 'MANAGER')
  const sp = await searchParams
  const supabase = await createClient()
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

  const { data: mandates, error: mandatesError } = await fetchAllRows<BuyerProfile>((from, to) =>
    supabase.from('buyer_profiles').select('*').range(from, to),
  )
  const { data: people, error: peopleError } = await fetchAllRows<Profile>((from, to) =>
    supabase.from('profiles').select('*').eq('role', 'BUYER').range(from, to),
  )

  const byId = new Map(people.map((p) => [p.id, p]))
  const sector = str(sp.sector)
  const jurisdiction = str(sp.jurisdiction)
  const q = str(sp.q).toLowerCase()

  const rows = mandates
    .map((m) => ({ mandate: m, person: byId.get(m.user_id) }))
    .filter((r): r is { mandate: BuyerProfile; person: Profile } => Boolean(r.person))
    .filter(({ mandate, person }) => {
      if (sector && !mandate.sectors.includes(sector)) return false
      if (jurisdiction && !mandate.jurisdictions.includes(jurisdiction)) return false
      if (q) {
        const hay = [person.full_name, person.company, mandate.headline, mandate.description]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

  const allSectors = [...new Set(mandates.flatMap((m) => m.sectors))].sort()
  const allJurisdictions = [...new Set(mandates.flatMap((m) => m.jurisdictions))].sort()

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6">
          <p className="text-xs text-faint">N5Deal / Buyers</p>
          <h1 className="text-xl font-semibold">Buyer mandates</h1>
          <p className="mt-1 text-sm text-muted">
            What each buyer is looking for, so you can approach the right counterparty.
          </p>
        </div>

        <LoadWarning what="The buyer directory" error={mandatesError ?? peopleError} />

        <BuyerFilters sectors={allSectors} jurisdictions={allJurisdictions} />

        <p className="mb-3 text-sm text-faint">
          {rows.length} of {mandates.length} buyers
        </p>

        <div className="grid gap-4">
          {rows.map(({ mandate, person }) => (
            <article key={mandate.user_id} className="rounded-xl border bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">
                    {person.company ?? person.full_name}
                    {person.status === 'SUSPENDED' && (
                      <span className="ml-2 rounded-full bg-danger-bg px-2 py-0.5 text-[10px] text-danger">
                        suspended
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted">{mandate.headline}</p>
                </div>
                <div className="rounded-lg border px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-faint">Ticket</p>
                  <p className="text-sm">
                    {formatTicket(mandate.ticket_min_eur, mandate.ticket_max_eur)}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {mandate.sectors.map((s) => (
                  <span key={s} className="rounded-full border px-2.5 py-1 text-xs text-muted">
                    {s}
                  </span>
                ))}
                {mandate.jurisdictions.map((j) => (
                  <span key={j} className="rounded-full bg-elevated px-2.5 py-1 text-xs text-faint">
                    {j}
                  </span>
                ))}
              </div>

              {mandate.description && (
                <p className="mb-4 text-sm text-muted">{mandate.description}</p>
              )}

              <div className="flex justify-end border-t pt-3">
                <Link
                  href={`/buyers/${mandate.user_id}`}
                  className="rounded-full border px-4 py-1.5 text-xs transition hover:border-accent-text hover:text-accent-text"
                >
                  View and contact
                </Link>
              </div>
            </article>
          ))}
          {rows.length === 0 && (
            <p className="rounded-xl border bg-surface px-5 py-8 text-center text-sm text-muted">
              No buyer matches these filters.
            </p>
          )}
        </div>
      </main>
    </>
  )
}

function formatTicket(min: number | null, max: number | null): string {
  const f = (n: number) =>
    n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `€${Math.round(n / 1000)}K`
  if (min !== null && max !== null) return `${f(min)} – ${f(max)}`
  if (max !== null) return `up to ${f(max)}`
  if (min !== null) return `from ${f(min)}`
  return 'Any'
}
