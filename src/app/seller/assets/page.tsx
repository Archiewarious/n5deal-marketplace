import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { formatPriceShort, formatDate } from '@/lib/format'
import { getT } from '@/lib/locale'
import { TopNav } from '@/components/TopNav'
import { ListingStatusControl } from '@/components/ListingStatusControl'
import type { Asset } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'
import { StatStrip } from '@/components/StatStrip'
import { CountryTag } from '@/components/CountryTag'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('nav.myListings') }
}

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

const STATE_KEY: Record<Asset['status'], string> = {
  PUBLISHED: 'state.published',
  DRAFT: 'state.draft',
  SUSPENDED: 'state.suspended',
  REMOVED: 'state.removed',
}

export default async function SellerAssetsPage() {
  const profile = await requireRole('SELLER')
  const t = await getT()
  const supabase = await createClient()

  // No seller_id filter needed — the RLS policy already restricts this to own rows.
  // It is written explicitly anyway, so the intent is readable without opening the schema.
  const { data: assets, error: assetsError } = await fetchAllRows<Asset>((from, to) =>
    supabase
      .from('assets')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false })
      .range(from, to),
  )

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-faint">{t('seller.crumb')}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{t('seller.title')}</h1>
            <p className="mt-1 text-sm text-muted">
              {t('seller.lede')}
            </p>
          </div>
          <Link
            href="/seller/assets/new"
            className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            {t('seller.publish')}
          </Link>
        </div>

        {/* What a seller checks when they open this page: is anything still sitting in draft,
            and is anyone looking. Both are counted from the rows in the table below. */}
        <StatStrip
          stats={[
            {
              label: t('seller.live'),
              value: t('admin.ofTotal', {
                shown: assets.filter((a) => a.status === 'PUBLISHED').length,
                total: assets.length,
              }),
              tone: 'text-ok',
            },
            {
              label: t('seller.inDraft'),
              value: String(assets.filter((a) => a.status === 'DRAFT').length),
            },
            {
              label: t('seller.viewsStat'),
              value: String(assets.reduce((sum, a) => sum + a.views, 0)),
            },
            {
              label: t('seller.valueListed'),
              value: formatPriceShort(
                assets
                  .filter((a) => a.status === 'PUBLISHED')
                  .reduce((sum, a) => sum + a.asking_price_cents, 0),
              ),
              tone: 'text-accent-text',
            },
          ]}
        />

        <LoadWarning what={t('admin.loadYourListings')} error={assetsError} />

        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                <th className="px-4 py-3 font-normal">{t('seller.colAsset')}</th>
                <th className="px-4 py-3 font-normal">{t('seller.colJurisdiction')}</th>
                <th className="px-4 py-3 font-normal">{t('seller.colPrice')}</th>
                <th className="px-4 py-3 font-normal">{t('seller.colViews')}</th>
                <th className="px-4 py-3 font-normal">{t('seller.colStatus')}</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/assets/${a.id}`} className="hover:text-accent-text">
                      {a.title}
                    </Link>
                    <p className="text-xs text-faint">
                      #{a.public_id} · {formatDate(a.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-muted">
                      <CountryTag country={a.country} />
                      <span className="hidden lg:inline">{a.country}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatPriceShort(a.asking_price_cents)}
                  </td>
                  <td className="px-4 py-3 text-muted">{a.views}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_STYLE[a.status]}`}>
                      {t(STATE_KEY[a.status])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-2">
                      <Link
                        href={`/seller/assets/${a.id}/edit`}
                        className="rounded-full border px-3 py-1 text-xs text-muted transition hover:border-accent-text hover:text-accent-text"
                      >
                        {t('seller.edit')}
                      </Link>
                      <ListingStatusControl assetId={a.id} status={a.status} owner />
                    </span>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {t('seller.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
