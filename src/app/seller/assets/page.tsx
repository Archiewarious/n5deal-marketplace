import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { formatPriceShort, formatDate } from '@/lib/format'
import { TopNav } from '@/components/TopNav'
import { ListingStatusControl } from '@/components/ListingStatusControl'
import type { Asset } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

export default async function SellerAssetsPage() {
  const profile = await requireRole('SELLER')
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-faint">N5Deal / My listings</p>
            <h1 className="text-xl font-semibold">Listings you published</h1>
          </div>
          <Link
            href="/seller/assets/new"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg"
          >
            Publish an asset
          </Link>
        </div>

        <LoadWarning what="Your listings" error={assetsError} />

        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                <th className="px-4 py-3 font-normal">Asset</th>
                <th className="px-4 py-3 font-normal">Jurisdiction</th>
                <th className="px-4 py-3 font-normal">Price</th>
                <th className="px-4 py-3 font-normal">Views</th>
                <th className="px-4 py-3 font-normal">Status</th>
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
                  <td className="px-4 py-3 text-muted">{a.country}</td>
                  <td className="px-4 py-3">{formatPriceShort(a.asking_price_cents)}</td>
                  <td className="px-4 py-3 text-muted">{a.views}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_STYLE[a.status]}`}>
                      {a.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ListingStatusControl assetId={a.id} status={a.status} owner />
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Nothing published yet.
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
