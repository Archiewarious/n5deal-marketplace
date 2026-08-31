import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { getT } from '@/lib/locale'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { TopNav } from '@/components/TopNav'
import { BuyerFilters } from '@/components/BuyerFilters'
import { matchAssetToBuyer } from '@/lib/matching'
import type { Asset, BuyerProfile, Profile } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('buyers.title') }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function BuyersPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole('SELLER', 'MANAGER')
  const t = await getT()
  const sp = await searchParams
  const supabase = await createClient()
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

  const { data: mandates, error: mandatesError } = await fetchAllRows<BuyerProfile>((from, to) =>
    supabase.from('buyer_profiles').select('*').range(from, to),
  )
  const { data: people, error: peopleError } = await fetchAllRows<Profile>((from, to) =>
    supabase.from('profiles').select('*').eq('role', 'BUYER').range(from, to),
  )

  // A seller opening this page is asking one question: which of these buyers is worth writing
  // to. The matching function that answers it already runs on the catalogue and on the buyer
  // detail page; here it runs once per mandate against this seller's own live listings, so the
  // count on each card is "how many of mine fit yours". A manager has no catalogue of their
  // own, so they get the directory without the badge rather than a badge reading zero.
  const { data: myAssets } =
    profile.role === 'SELLER'
      ? await fetchAllRows<Asset>((from, to) =>
          supabase
            .from('assets')
            .select('*')
            .eq('seller_id', profile.id)
            .eq('status', 'PUBLISHED')
            .range(from, to),
        )
      : { data: [] as Asset[] }

  // 60 is the point at which two of the three axes have to agree. Below it a "match" is one
  // coincidence, and a badge that fires on every card tells a seller nothing.
  const fitCount = (m: BuyerProfile) =>
    myAssets.filter((a) => (matchAssetToBuyer(a, m).score ?? 0) >= 60).length

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
          <p className="text-xs text-faint">{t('buyers.crumb')}</p>
          <h1 className="mt-1 heading text-2xl font-semibold">{t('buyers.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('buyers.lede')}</p>
        </div>

        <LoadWarning what={t('admin.loadBuyers')} error={mandatesError ?? peopleError} />

        <BuyerFilters sectors={allSectors} jurisdictions={allJurisdictions} />

        <p className="mb-3 text-sm text-faint">
          {t('buyers.count', { shown: rows.length, total: mandates.length })}
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
                        {t('nav.suspended')}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted">{mandate.headline}</p>
                </div>
                <div className="flex items-center gap-3">
                  {myAssets.length > 0 &&
                    (() => {
                      const fits = fitCount(mandate)
                      return (
                        <span
                          className={`rounded-full border px-3 py-1 font-mono text-[11px] ${
                            fits > 0
                              ? 'border-accent-text text-accent-text'
                              : 'text-faint'
                          }`}
                        >
                          {t('buyers.fit', { fits, total: myAssets.length })}
                        </span>
                      )
                    })()}
                  <div className="rounded-lg border px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-faint">
                      {t('buyers.ticket')}
                    </p>
                    <p className="font-mono text-sm tabular-nums">
                      {formatTicket(mandate.ticket_min_eur, mandate.ticket_max_eur, t)}
                    </p>
                  </div>
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
                  {t('buyers.viewAndContact')}
                </Link>
              </div>
            </article>
          ))}
          {rows.length === 0 && (
            <p className="rounded-xl border bg-surface px-5 py-8 text-center text-sm text-muted">
              {t('buyers.empty')}
            </p>
          )}
        </div>
      </main>
    </>
  )
}

function formatTicket(
  min: number | null,
  max: number | null,
  t: Awaited<ReturnType<typeof getT>>,
): string {
  const f = (n: number) =>
    n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `€${Math.round(n / 1000)}K`
  if (min !== null && max !== null) return `${f(min)} – ${f(max)}`
  if (max !== null) return t('buyers.ticketUpTo', { price: f(max) })
  if (min !== null) return t('buyers.ticketFrom', { price: f(min) })
  return t('buyers.ticketAny')
}
