import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { parseQuery } from '@/lib/parseQuery'
import { parsePriceToCents, formatPriceFull } from '@/lib/format'
import { matchAssetToBuyer } from '@/lib/matching'
import { AssetCard } from '@/components/AssetCard'
import { AssetFilters } from '@/components/AssetFilters'
import { TopNav } from '@/components/TopNav'
import type { Asset, BuyerProfile } from '@/lib/types'

export const metadata = { title: 'All listings' }

type Scored = { a: Asset; score: number | undefined }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile()
  const sp = await searchParams
  const supabase = await createClient()

  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

  // A free-text query is parsed into structured filters first; explicit dropdown values
  // win over anything inferred from the text, because the user set them deliberately.
  const parsed = parseQuery(str(sp.q))
  const sector = str(sp.sector) || parsed.sector
  const country = str(sp.country) || parsed.country
  const kind = str(sp.kind)
  // A price the parser cannot read must not disappear silently. Filtering as if the field were
  // empty is the worst of the three options: the user sees every listing and believes the cap
  // was applied. The value is kept and reported instead.
  const rawMax = str(sp.max)
  const typedMaxCents = rawMax ? parsePriceToCents(rawMax) : null
  const maxPriceUnreadable = Boolean(rawMax) && typedMaxCents === null
  const maxCents = typedMaxCents ?? parsed.maxPriceCents

  // Paginated read: PostgREST silently truncates at the project row cap, and a catalogue
  // is exactly the kind of set that grows past it without anyone noticing.
  const { data: all, error } = await fetchAllRows<Asset>((from, to) =>
    supabase
      .from('assets')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })
      .range(from, to),
  )

  const counts: Record<string, number> = {}
  for (const a of all) counts[a.sector] = (counts[a.sector] ?? 0) + 1

  // Every published price grouped by sector, so a card can show where its own price sits
  // among comparable listings. Computed once here rather than per card.
  const pricesBySector: Record<string, number[]> = {}
  for (const a of all) (pricesBySector[a.sector] ??= []).push(a.asking_price_cents)
  for (const list of Object.values(pricesBySector)) list.sort((x, y) => x - y)
  const allPrices = all.map((a) => a.asking_price_cents).sort((x, y) => x - y)

  // Compare within the sector when there are enough of them to form a distribution; fall back
  // to the whole catalogue and say so, rather than showing nothing.
  const peerSet = (a: Asset) => {
    const sectorPeers = pricesBySector[a.sector] ?? []
    return sectorPeers.length >= 3
      ? { peersCents: sectorPeers, peerLabel: `Price against ${sectorPeers.length} other ${a.sector} listings` }
      : { peersCents: allPrices, peerLabel: `Price against all ${allPrices.length} listings` }
  }
  const countries = [...new Set(all.map((a) => a.country))].sort()

  const needle = parsed.text.toLowerCase()

  const matchesStructured = (a: Asset) => {
    if (sector && a.sector !== sector) return false
    if (country && a.country !== country) return false
    if (kind && a.asset_kind !== kind) return false
    if (maxCents !== null && a.asking_price_cents > maxCents) return false
    if (parsed.minPriceCents !== null && a.asking_price_cents < parsed.minPriceCents) return false
    return true
  }

  const matchesText = (a: Asset) => {
    if (!needle) return true
    const hay = [a.title, a.description, a.license_type, a.regulator, ...a.included_activities]
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  }

  const structured = all.filter(matchesStructured)
  const narrowed = structured.filter(matchesText)

  // The leftover words of a free-text query are a refinement, not a requirement. If they would
  // empty a result set that the structured part of the same query found, the words are dropped
  // and the user is told — "crypto in Poland under 500k" should never return nothing just
  // because a stray adjective is absent from the listing text.
  const textIgnored = Boolean(needle) && narrowed.length === 0 && structured.length > 0
  const visible = textIgnored ? structured : narrowed

  // A buyer sees how well each listing fits their own mandate.
  let mandate: BuyerProfile | null = null
  if (profile.role === 'BUYER') {
    const { data } = await supabase
      .from('buyer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle<BuyerProfile>()
    mandate = data
  }

  const scored = mandate
    ? visible.map((a) => ({ a, score: matchAssetToBuyer(a, mandate).score ?? undefined }))
    : visible.map((a) => ({ a, score: undefined as number | undefined }))

  // The listings arrive newest first from Postgres, so "new" is the absence of a comparator
  // rather than a comparator of its own. A buyer with a mandate falls through to fit unless
  // they ask for something else, which is the one case where the default is not the natural
  // order — a mandate with no criteria scores null on every listing and keeps that order.
  const sort = str(sp.sort)
  const SORTS: Record<string, (x: Scored, y: Scored) => number> = {
    'price-desc': (x, y) => y.a.asking_price_cents - x.a.asking_price_cents,
    'price-asc': (x, y) => x.a.asking_price_cents - y.a.asking_price_cents,
    views: (x, y) => y.a.views - x.a.views,
  }
  const comparator =
    SORTS[sort] ??
    (mandate && sort !== 'new'
      ? (x: Scored, y: Scored) => (y.score ?? -1) - (x.score ?? -1)
      : null)
  const rows = comparator ? [...scored].sort(comparator) : scored

  const sortedByFit = comparator !== null && !SORTS[sort]

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-faint">N5Deal / All listings</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Licensed assets and businesses
            </h1>
            <p className="mt-1 text-sm text-muted">
              Banks, EMIs, payment institutions and crypto entities across{' '}
              {countries.length} jurisdictions.
            </p>
          </div>

          {/* The reference site keeps a live total of what is on the platform in its header —
              it turns a catalogue into a market. This one is the real sum of what is listed. */}
          <div className="rounded-xl border bg-surface px-4 py-3 text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-faint">
              <span className="size-1.5 rounded-full bg-seller" />
              Value on the platform
            </p>
            <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
              {formatPriceFull(all.reduce((sum, a) => sum + a.asking_price_cents, 0))}
            </p>
          </div>
        </div>

        <AssetFilters counts={counts} countries={countries} canSortByFit={mandate !== null} />

        {error ? (
          <p className="mb-4 rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            The catalogue could not be loaded in full. Showing what was received.
          </p>
        ) : null}

        {profile.status === 'SUSPENDED' && (
          <p className="mb-4 rounded-lg border border-warn bg-warn-bg px-3 py-2 text-sm text-warn">
            Your account is suspended, so published listings are hidden from you. Contact the
            platform manager to restore access.
          </p>
        )}

        {maxPriceUnreadable && (
          <p className="mb-4 rounded-lg border border-warn bg-warn-bg px-3 py-2 text-sm text-warn">
            &ldquo;{rawMax}&rdquo; could not be read as a price, so no price cap was applied. Try
            2.5M, 400K or 40000.
          </p>
        )}

        {textIgnored && (
          <p className="mb-4 rounded-lg border bg-surface px-3 py-2 text-sm text-muted">
            No listing contains &ldquo;{parsed.text}&rdquo;. Showing the{' '}
            {structured.length === 1 ? 'listing' : 'listings'} that match the rest of your search.
          </p>
        )}

        {mandate && rows.every((r) => r.score === undefined) && rows.length > 0 && (
          <p className="mb-4 rounded-lg border bg-surface px-3 py-2 text-sm text-muted">
            Your mandate has no criteria yet, so nothing can be ranked against it.{' '}
            <Link href="/buyer/profile" className="text-accent-text hover:underline">
              Describe what you are looking for
            </Link>{' '}
            and this list will reorder itself.
          </p>
        )}

        {/* The filters are plain GET forms, so a filter change is a navigation and the count
            is the only thing that reports what happened. aria-live makes it report to everyone. */}
        <p aria-live="polite" className="mb-3 text-sm text-faint">
          {rows.length} of {all.length} listings
          {sortedByFit && rows.some((r) => r.score !== undefined)
            ? ' · sorted by fit with your mandate'
            : sort === 'price-desc'
              ? ' · most expensive first'
              : sort === 'price-asc'
                ? ' · cheapest first'
                : sort === 'views'
                  ? ' · most viewed first'
                  : ' · newest first'}
        </p>

        <div className="grid gap-4">
          {rows.map(({ a, score }, i) => (
            <div key={a.id} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
            <AssetCard
              asset={a}
              matchScore={score}
              {...peerSet(a)}
            />
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border bg-surface px-5 py-10 text-center">
              <p className="text-sm text-muted">
                Nothing matches these filters.
                {all.length > 0 && ` All ${all.length} listings are still there.`}
              </p>
              <Link
                href="/assets"
                className="mt-4 inline-block rounded-full border px-5 py-2 text-sm text-accent-text transition hover:border-accent-text"
              >
                Clear every filter
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
