import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { parseQuery } from '@/lib/parseQuery'
import { aiEnabled } from '@/lib/ai'
import { parsePriceToCents, formatPriceFull } from '@/lib/format'
import { matchAssetToBuyer } from '@/lib/matching'
import { AssetCard } from '@/components/AssetCard'
import { AssetFilters } from '@/components/AssetFilters'
import { TopNav } from '@/components/TopNav'
import type { Asset, BuyerProfile } from '@/lib/types'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('listing.allListings') }
}

type Scored = { a: Asset; score: number | undefined }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile()
  const t = await getT()
  const tag = intlTag(await getLocale())
  const sp = await searchParams
  const supabase = await createClient()

  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

  // A free-text query is parsed into structured filters first; explicit dropdown values
  // win over anything inferred from the text, because the user set them deliberately.
  const rawQuery = str(sp.q)
  const parsed = parseQuery(rawQuery)
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
  // "eight figures" is the kind of thing only the model reads, and it comes back as a floor
  // rather than a ceiling, so the URL has to be able to carry one.
  const rawMin = str(sp.min)
  const typedMinCents = rawMin ? parsePriceToCents(rawMin) : null

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
      ? {
          peersCents: sectorPeers,
          peerLabel: t('chart.againstSector', { n: sectorPeers.length, sector: a.sector }),
        }
      : { peersCents: allPrices, peerLabel: t('chart.againstAll', { n: allPrices.length }) }
  }
  const countries = [...new Set(all.map((a) => a.country))].sort()

  // No model call on this path. The search box resolves a sentence into filters once, when it
  // is submitted (see api/parse-query), and puts the result in the URL — so this render is
  // deterministic, fast, and identical for anyone the link is sent to. `reading` is the label
  // the model produced, carried along so the page can show what was understood.
  // Capped, and only shown when the query it describes is actually in the URL beside it.
  // Anyone can craft ?reading=<anything> and have it rendered inside the app's own chrome, and
  // an unbounded attacker-controlled sentence in a band the product owns is a phishing surface
  // even when React escapes it. A label with no filters to label is a lie by itself.
  const hasResolvedFilters = Boolean(
    str(sp.sector) || str(sp.country) || str(sp.max) || str(sp.min) || str(sp.q),
  )
  const reading = hasResolvedFilters ? str(sp.reading).slice(0, 120) : ''
  const q = parsed

  const needle = q.text.toLowerCase()

  const matchesStructured = (a: Asset) => {
    // Explicit controls still win: a dropdown the user set beats anything read out of the text,
    // whether it was read by the parser or by the model.
    const wantSector = str(sp.sector) || q.sector
    const wantCountry = str(sp.country) || q.country
    if (wantSector && a.sector !== wantSector) return false
    if (wantCountry && a.country !== wantCountry) return false
    if (kind && a.asset_kind !== kind) return false
    const cap = typedMaxCents ?? q.maxPriceCents
    if (cap !== null && a.asking_price_cents > cap) return false
    const floor = typedMinCents ?? q.minPriceCents
    if (floor !== null && a.asking_price_cents < floor) return false
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
            <p className="text-xs text-faint">{t('assets.crumb')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('assets.title')}</h1>
            <p className="mt-1 text-sm text-muted">
              {t('assets.lede', { n: countries.length })}
            </p>
          </div>

          {/* The reference site keeps a live total of what is on the platform in its header —
              it turns a catalogue into a market. This one is the real sum of what is listed. */}
          <div className="rounded-xl border bg-surface px-4 py-3 text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-faint">
              <span className="size-1.5 rounded-full bg-seller" />
              {t('assets.valueOnPlatform')}
            </p>
            <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
              {formatPriceFull(all.reduce((sum, a) => sum + a.asking_price_cents, 0), tag)}
            </p>
          </div>
        </div>

        <AssetFilters
          counts={counts}
          countries={countries}
          canSortByFit={mandate !== null}
          aiAvailable={aiEnabled()}
        />

        {error ? (
          <p className="mb-4 rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {t('assets.loadFailed')}
          </p>
        ) : null}

        {profile.status === 'SUSPENDED' && (
          <p className="mb-4 rounded-lg border border-warn bg-warn-bg px-3 py-2 text-sm text-warn">
            {t('assets.suspendedNotice')}
          </p>
        )}

        {maxPriceUnreadable && (
          <p className="mb-4 rounded-lg border border-warn bg-warn-bg px-3 py-2 text-sm text-warn">
            {t('assets.badPrice', { value: rawMax })}
          </p>
        )}

        {reading && (
          <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-accent-text/30 bg-accent/[0.07] px-3 py-2 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent-text">
              {t('assets.readAs')}
            </span>
            <span className="text-muted">{reading}</span>
            <Link href="/assets" className="ml-auto text-xs text-faint transition hover:text-fg">
              {t('assets.clearReading')}
            </Link>
          </p>
        )}

        {textIgnored && (
          <p className="mb-4 rounded-lg border bg-surface px-3 py-2 text-sm text-muted">
            {t('assets.textIgnored', { text: q.text })}
          </p>
        )}

        {mandate && rows.every((r) => r.score === undefined) && rows.length > 0 && (
          <p className="mb-4 rounded-lg border bg-surface px-3 py-2 text-sm text-muted">
            {t('assets.noMandate')}{' '}
            <Link href="/buyer/profile" className="text-accent-text hover:underline">
              {t('assets.describeMandate')}
            </Link>{' '}
            {t('assets.andReorder')}
          </p>
        )}

        {/* The filters are plain GET forms, so a filter change is a navigation and the count
            is the only thing that reports what happened. aria-live makes it report to everyone. */}
        <p aria-live="polite" className="mb-3 text-sm text-faint">
          {t('assets.count', { shown: rows.length, total: all.length })}
          {' · '}
          {sortedByFit && rows.some((r) => r.score !== undefined)
            ? t('assets.byFit')
            : sort === 'price-desc'
              ? t('assets.byPriceDesc')
              : sort === 'price-asc'
                ? t('assets.byPriceAsc')
                : sort === 'views'
                  ? t('assets.byViews')
                  : t('assets.byNew')}
        </p>

        <div className="grid gap-4">
          {rows.map(({ a, score }, i) => (
            <div key={a.id} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
            <AssetCard
              t={t}
              tag={tag}
              asset={a}
              matchScore={score}
              {...peerSet(a)}
            />
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border bg-surface px-5 py-10 text-center">
              <p className="text-sm text-muted">
                {t('assets.emptyTitle')}
                {all.length > 0 && ` ${t('assets.emptyRest', { n: all.length })}`}
              </p>
              {/* Only when there is something to clear. An empty catalogue that offers to reset
                  filters nobody set sends the reader looking for a control that is not there. */}
              {[...Object.keys(sp)].length > 0 && (
                <Link
                  href="/assets"
                  className="mt-4 inline-block rounded-full border px-5 py-2 text-sm text-accent-text transition hover:border-accent-text"
                >
                  {t('assets.clearFilters')}
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
