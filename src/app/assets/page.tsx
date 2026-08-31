import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { parseQuery } from '@/lib/parseQuery'
import { parsePriceToCents } from '@/lib/format'
import { matchAssetToBuyer } from '@/lib/matching'
import { AssetCard } from '@/components/AssetCard'
import { AssetFilters } from '@/components/AssetFilters'
import { TopNav } from '@/components/TopNav'
import type { Asset, BuyerProfile } from '@/lib/types'

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

  const rows = mandate
    ? visible
        .map((a) => ({ a, score: matchAssetToBuyer(a, mandate).score }))
        .sort((x, y) => y.score - x.score)
    : visible.map((a) => ({ a, score: undefined as number | undefined }))

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6">
          <p className="text-xs text-faint">N5Deal / All listings</p>
          <h1 className="text-xl font-semibold">Licensed assets and businesses</h1>
        </div>

        <AssetFilters counts={counts} countries={countries} />

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

        <p className="mb-3 text-sm text-faint">
          {rows.length} of {all.length} listings
          {mandate && ' · sorted by fit with your mandate'}
        </p>

        <div className="grid gap-4">
          {rows.map(({ a, score }) => (
            <AssetCard key={a.id} asset={a} matchScore={score} />
          ))}
          {rows.length === 0 && (
            <p className="rounded-xl border bg-surface px-5 py-8 text-center text-sm text-muted">
              Nothing matches these filters.
            </p>
          )}
        </div>
      </main>
    </>
  )
}
