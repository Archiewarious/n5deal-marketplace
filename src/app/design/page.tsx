import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'
import { formatPriceShort, formatPriceFull, formatDate } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { sectorTone } from '@/lib/sector'
import { AssetCard } from '@/components/AssetCard'
import { PriceChart } from '@/components/PriceChart'
import { TopNav } from '@/components/TopNav'
import type { Asset } from '@/lib/types'
import type { T } from '@/lib/i18n'

export const metadata = { title: 'Card designs' }

// A scratch page for choosing a card, not part of the product.
//
// Four designs, one real listing, one screen. Arguing about a card in prose is how the last
// three revisions happened; putting them side by side takes ten minutes and settles it.
// Whichever wins becomes AssetCard and this route is deleted.

type Props = { asset: Asset; peers: number[]; t: T; tag: string }

/** B — Dossier. Two columns: who and how much on the left, the specification on the right. */
function Dossier({ asset, peers, t, tag }: Props) {
  const tone = sectorTone(asset.sector)
  const facts = [
    [t('card.typeOfLicence'), asset.license_type],
    [t('card.regulator'), asset.regulator],
    [t('card.yearOfIssue'), asset.year_of_issue],
    [t('card.employees'), asset.employees],
  ] as const

  return (
    <article className="relative grid overflow-hidden rounded-2xl border bg-surface md:grid-cols-[minmax(0,20rem)_1fr]">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${tone.dot}`} />

      <div className="border-b p-6 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs text-muted">
            {asset.public_id}
          </span>
          <CountryTag country={asset.country} size="lg" />
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${tone.bg} ${tone.text}`}
          >
            {asset.sector}
          </span>
        </div>

        <h2 className="heading text-xl font-medium leading-snug">{asset.title}</h2>

        <p className="mt-5 font-mono text-3xl font-medium tabular-nums text-accent-text">
          {formatPriceShort(asset.asking_price_cents)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-faint">{t('listing.askingPrice')}</p>

        <p className="mt-5 text-sm leading-relaxed text-muted">{asset.description}</p>

        <p className="mt-6 font-mono text-xs text-faint">
          {formatDate(asset.created_at, tag)} · {asset.views} {t('card.views')}
        </p>
      </div>

      <div className="p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-faint">{k}</dt>
              <dd className={`truncate text-sm ${v === null ? 'text-faint' : ''}`}>
                {v ?? t('card.na')}
              </dd>
            </div>
          ))}
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-faint">
              {t('card.businessStatus')}
            </dt>
            <dd
              className={`truncate text-sm ${asset.business_state === 'ACTIVE' ? 'text-ok' : 'text-faint'}`}
            >
              {asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive')}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-faint">
              {t('listing.assetType')}
            </dt>
            <dd className="truncate text-sm">
              {asset.asset_kind === 'LICENSE_ONLY'
                ? t('filters.licenceOnly')
                : t('filters.activeBusiness')}
            </dd>
          </div>
        </dl>

        {asset.included_activities.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
            {asset.included_activities.map((a) => (
              <span key={a} className="rounded-full border px-3 py-1 text-xs text-muted">
                {a}
              </span>
            ))}
          </div>
        )}

        {peers.length >= 3 && (
          <div className="mt-5 border-t pt-5">
            <PriceChart
              t={t}
              priceCents={asset.asking_price_cents}
              peersCents={peers}
              label={t('chart.againstSector', { n: peers.length - 1, sector: asset.sector })}
            />
          </div>
        )}
      </div>
    </article>
  )
}

/** C — Row. One line per listing. The specification lives on the listing's own page. */
function Row({ asset, t, tag }: Props) {
  const tone = sectorTone(asset.sector)
  return (
    <article className="relative flex flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden rounded-xl border bg-surface px-5 py-4">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${tone.dot}`} />

      <span className="grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs text-muted">
        {asset.public_id}
      </span>
      <CountryTag country={asset.country} />

      <div className="min-w-[14rem] flex-1">
        <h2 className="heading truncate text-base font-medium">{asset.title}</h2>
        <p className="mt-0.5 truncate text-xs text-muted">
          {asset.license_type} · {asset.regulator} · {asset.year_of_issue}
        </p>
      </div>

      <span
        className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${tone.bg} ${tone.text}`}
      >
        {asset.sector}
      </span>

      <span
        className={`text-xs ${asset.business_state === 'ACTIVE' ? 'text-ok' : 'text-faint'}`}
      >
        {asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive')}
      </span>

      <p className="ml-auto font-mono text-lg font-medium tabular-nums text-accent-text">
        {formatPriceShort(asset.asking_price_cents)}
      </p>

      <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg">
        {t('card.viewAsset')}
      </span>
    </article>
  )
}

/** D — Panel. A price band across the top, the specification as a three-up grid beneath it. */
function Panel({ asset, peers, t, tag }: Props) {
  const tone = sectorTone(asset.sector)
  const facts = [
    [t('card.typeOfLicence'), asset.license_type],
    [t('card.regulator'), asset.regulator],
    [t('card.yearOfIssue'), asset.year_of_issue],
    [t('card.employees'), asset.employees],
    [
      t('listing.assetType'),
      asset.asset_kind === 'LICENSE_ONLY' ? t('filters.licenceOnly') : t('filters.activeBusiness'),
    ],
    [
      t('card.businessStatus'),
      asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive'),
    ],
  ] as const

  return (
    <article className="overflow-hidden rounded-2xl border bg-surface">
      <header className={`flex flex-wrap items-center gap-4 border-b ${tone.bg} px-6 py-5`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-current/20 font-mono text-sm text-muted">
          {asset.public_id}
        </span>
        <div className="min-w-[12rem] flex-1">
          <h2 className="heading text-lg font-medium leading-tight">{asset.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <CountryTag country={asset.country} />
            <span className={`font-mono text-[11px] uppercase tracking-wider ${tone.text}`}>
              {asset.sector}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-medium tabular-nums">
            {formatPriceFull(asset.asking_price_cents, tag)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-faint">
            {t('listing.askingPrice')}
          </p>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wider text-faint">{k}</dt>
                <dd className={`truncate text-sm ${v === null ? 'text-faint' : ''}`}>
                  {v ?? t('card.na')}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 border-t pt-5 text-sm leading-relaxed text-muted">
            {asset.description}
          </p>

          {asset.included_activities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {asset.included_activities.map((a) => (
                <span key={a} className="rounded-full border px-3 py-1 text-xs text-muted">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {peers.length >= 3 && (
          <div className="rounded-xl border bg-field/50 p-4">
            <PriceChart
              t={t}
              priceCents={asset.asking_price_cents}
              peersCents={peers}
              label={t('chart.againstSector', { n: peers.length - 1, sector: asset.sector })}
            />
          </div>
        )}
      </div>
    </article>
  )
}

function Label({ letter, name, note }: { letter: string; name: string; note: string }) {
  return (
    <div id={letter.toLowerCase()} className="scroll-mt-24 mb-4 mt-14 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <span className="grid size-7 place-items-center rounded-full bg-accent font-mono text-xs text-accent-fg">
        {letter}
      </span>
      <h2 className="heading text-lg font-medium">{name}</h2>
      <p className="text-sm text-muted">{note}</p>
    </div>
  )
}

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const only = (await searchParams).v?.toLowerCase()
  const show = (letter: string) => !only || only === letter
  const profile = await requireProfile()
  const t = await getT()
  const tag = intlTag(await getLocale())
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('assets')
    .select('*')
    .eq('status', 'PUBLISHED')
    .eq('sector', 'Payment')
    .order('asking_price_cents', { ascending: false })
    .returns<Asset[]>()

  const all = rows ?? []
  const asset = all[3] ?? all[0]
  const peers = all.map((a) => a.asking_price_cents).sort((x, y) => x - y)

  if (!asset) return null
  const props = { asset, peers, t, tag }

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs text-faint">N5Deal / Card designs</p>
        <h1 className="display mt-1 text-3xl font-semibold">Four cards, one listing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The same real row rendered four ways, so the choice is made by looking rather than by
          describing. This route is scratch: whichever wins becomes the card and the page is
          deleted.
        </p>

        {show('a') && <Label
          letter="A"
          name="Ledger"
          note="What is live now. The reference site's shape: every field its own full-width row."
        />}
        {show('a') && <AssetCard t={t} tag={tag} asset={asset} peersCents={peers} matchScore={100} />}

        {show('b') && <Label
          letter="B"
          name="Dossier"
          note="Identity and price on the left, specification on the right. No field repeated."
        />}
        {show('b') && <Dossier {...props} />}

        {show('c') && <Label
          letter="C"
          name="Row"
          note="One line per listing. The full specification lives on the listing's own page."
        />}
        {show('c') && (
        <div className="grid gap-2">
          <Row {...props} />
          <Row {...props} asset={all[0]} />
          <Row {...props} asset={all[1]} />
        </div>
        )}

        {show('d') && <Label
          letter="D"
          name="Panel"
          note="Price band across the top, specification as a grid, chart beside it."
        />}
        {show('d') && <Panel {...props} />}
      </main>
    </>
  )
}
