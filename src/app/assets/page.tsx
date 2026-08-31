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
  const maxCents = parsePriceToCents(str(sp.max)) ?? parsed.maxPriceCents

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
  const visible = all.filter((a) => {
    if (sector && a.sector !== sector) return false
    if (country && a.country !== country) return false
    if (kind && a.asset_kind !== kind) return false
    if (maxCents !== null && a.asking_price_cents > maxCents) return false
    if (parsed.minPriceCents !== null && a.asking_price_cents < parsed.minPriceCents) return false
    if (needle) {
      const hay = [a.title, a.description, a.license_type, a.regulator, ...a.included_activities]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

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
