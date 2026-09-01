import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'
import { formatPriceFull, formatDate } from '@/lib/format'
import { matchAssetToBuyer } from '@/lib/matching'
import { TopNav } from '@/components/TopNav'
import { ContactForm } from '@/components/ContactForm'
import { PriceChart } from '@/components/PriceChart'
import { CountryTag } from '@/components/CountryTag'
import { ListingStatusControl } from '@/components/ListingStatusControl'
import { ViewPing } from '@/components/ViewPing'
import { sectorTone } from '@/lib/sector'
import type { Asset, BuyerProfile, Profile } from '@/lib/types'

const STATE_KEY: Record<Asset['status'], string> = {
  PUBLISHED: 'state.published',
  DRAFT: 'state.draft',
  SUSPENDED: 'state.suspended',
  REMOVED: 'state.removed',
}

// A shared listing link should say which listing it is, in the tab and in the preview card.
// RLS applies here too: a title only comes back for a row this session may read.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getT()
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('title')
    .eq('id', id)
    .maybeSingle<{ title: string }>()
  return { title: data?.title ?? t('meta.listing') }
}

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile()
  const t = await getT()
  const tag = intlTag(await getLocale())
  const { id } = await params
  const supabase = await createClient()

  // No status filter here on purpose: RLS decides what this user may see. A seller can
  // open their own draft through this page, a manager can open anything, and anyone else
  // gets a 404 rather than a permission error — the row simply does not exist for them.
  const { data: asset } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .maybeSingle<Asset>()

  if (!asset) notFound()

  const { data: seller } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', asset.seller_id)
    .maybeSingle<Profile>()

  // Peers for the price chart. Published rows only, and RLS narrows that further per role, so
  // the comparison is always against listings this user can actually go and look at.
  // Sector first, because "expensive for an EMI" is the question a buyer is asking. Some
  // sectors hold two listings, and two dots are not a distribution, so those fall back to the
  // whole catalogue rather than showing nothing.
  const { data: peers } = await supabase
    .from('assets')
    .select('asking_price_cents, sector')
    .eq('status', 'PUBLISHED')
    .returns<{ asking_price_cents: number; sector: string }[]>()
  const published = peers ?? []
  const sectorPeers = published.filter((r) => r.sector === asset.sector)
  const useSector = sectorPeers.length >= 3
  const peersCents = (useSector ? sectorPeers : published).map((r) => r.asking_price_cents)
  const peerLabel = useSector
    ? t('chart.againstSector', { n: peersCents.length, sector: asset.sector })
    : t('chart.againstAll', { n: peersCents.length })

  let match: ReturnType<typeof matchAssetToBuyer> | null = null
  if (profile.role === 'BUYER') {
    const { data: mandate } = await supabase
      .from('buyer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle<BuyerProfile>()
    if (mandate) match = matchAssetToBuyer(asset, mandate)
  }

  const tone = sectorTone(asset.sector)

  return (
    <>
      <TopNav profile={profile} />
      {/* Counts a view once, from the browser. The seller looking at their own listing is filtered
          out in the database function rather than here, so the rule holds for any caller. */}
      <ViewPing assetId={asset.id} />
      <main id="content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Link href="/assets" className="text-xs text-faint transition hover:text-fg">
          ← {t('listing.allListings')}
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs text-faint">
                {t('listing.assetId')} #{asset.public_id}
              </p>
              {asset.validated && (
                <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[10px] text-ok">
                  {t('card.validated')}
                </span>
              )}
              {asset.status !== 'PUBLISHED' && (
                <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[10px] text-warn">
                  {t(STATE_KEY[asset.status])}
                </span>
              )}
            </div>
            {/* Issuer and jurisdiction above the title, the same way the card reads them: that
                pair is the product, and printing it here removes the Country and Type-of-business
                boxes that used to repeat it four rows further down. */}
            <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-faint">
              {t('card.issuedBy')}
            </p>
            <div className="mt-1.5 mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CountryTag country={asset.country} size="lg" />
              <span className="text-sm font-medium">{asset.regulator ?? t('card.na')}</span>
              <span className="text-sm text-muted">· {asset.country}</span>
            </div>
            <h1 className="display text-3xl font-semibold">{asset.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
              <span className={`font-medium ${tone.text}`}>{asset.license_type}</span>
              <span className="text-faint">/</span>
              <span>{asset.sector}</span>
              {asset.year_of_issue !== null && (
                <>
                  <span className="text-faint">/</span>
                  <span>
                    {t('card.inForce')} {asset.year_of_issue}
                  </span>
                </>
              )}
              {asset.employees !== null && (
                <>
                  <span className="text-faint">/</span>
                  <span>{asset.employees} FTE</span>
                </>
              )}
              <span className="text-faint">/</span>
              <span className={asset.business_state === 'ACTIVE' ? 'text-ok' : 'text-faint'}>
                {asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive')}
              </span>
              <span className="text-faint">/</span>
              <span>
                {asset.asset_kind === 'LICENSE_ONLY'
                  ? t('filters.licenceOnly')
                  : t('filters.activeBusiness')}
              </span>
            </p>
            {seller && (
              <p className="mt-1 text-sm text-muted">
                {t('listing.listedBy')} {seller.company ?? seller.full_name} ·{' '}
                {formatDate(asset.created_at, tag)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* A manager reading a listing is exactly when they decide it does not belong on
                the platform, and until now the only place to act on that was the moderation
                table, with the listing they had just been reading no longer in front of them. */}
            {profile.role === 'MANAGER' && (
              <ListingStatusControl assetId={asset.id} status={asset.status} />
            )}
            {asset.seller_id === profile.id && (
              <Link
                href={`/seller/assets/${asset.id}/edit`}
                className="rounded-full border px-4 py-2 text-sm text-muted transition hover:border-accent-text hover:text-accent-text"
              >
                {t('listing.edit')}
              </Link>
            )}
            <div className="rounded-xl border px-5 py-3 text-right">
              <p className="text-[10px] uppercase tracking-wider text-faint">
                {t('listing.askingPrice')}
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatPriceFull(asset.asking_price_cents, tag)}
              </p>
            </div>
          </div>
        </div>

        {match && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full border border-accent-text px-3 py-1 text-sm text-accent-text">
                {t('card.match', { n: match.score ?? '' })}
              </span>
              <p className="text-sm text-muted">{t('listing.againstMandate')}</p>
            </div>
            <ul className="grid gap-1 text-sm">
              {match.reasons.map((r) => (
                <li key={r.axis} className={r.hit ? 'text-ok' : 'text-faint'}>
                  {r.hit ? '✓' : '✗'}{' '}
                  {r.axis === 'price' ? t('match.price') : t(`match.${r.axis}`, { value: r.value })}
                </li>
              ))}
            </ul>
          </section>
        )}

        {peersCents.length >= 3 && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <PriceChart
              t={t}
              priceCents={asset.asking_price_cents}
              peersCents={peersCents}
              label={peerLabel}
            />
          </section>
        )}

        {/* What the licence permits, at reading size. It was a row of grey chips under eight
            label/value boxes; it is the thing a buyer is choosing between. */}
        {asset.included_activities.length > 0 && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">
              {t('card.permits')}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {asset.included_activities.map((a) => (
                <li key={a} className="flex items-center gap-2.5 text-sm">
                  <svg viewBox="0 0 16 16" className={`size-4 shrink-0 ${tone.text}`} aria-hidden>
                    <path
                      d="M3 8.5l3.5 3.5L13 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}

        {asset.description && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">
              {t('card.assetInfo')}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{asset.description}</p>
          </section>
        )}

        {seller && profile.id !== seller.id && (
          <ContactForm
            toUserId={seller.id}
            toName={seller.company ?? seller.full_name}
            assetId={asset.id}
            disabled={profile.status === 'SUSPENDED'}
          />
        )}
      </main>
    </>
  )
}
