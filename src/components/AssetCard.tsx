import Link from 'next/link'
import { formatPriceShort, formatDate } from '@/lib/format'
import { countryFlag } from '@/lib/flags'
import { PriceContext } from './PriceContext'
import type { Asset } from '@/lib/types'

// The specification reads as a ledger, one fact per line, the way N5Deal presents a
// listing. A grid of tiles was the first attempt and it was wrong: a buyer scans these
// cards down a single column comparing the same field across listings, and a ledger keeps
// every "Country" on the same eye line while a grid scatters them.
function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number | null
  tone?: 'accent' | 'ok' | 'muted'
}) {
  const valueClass =
    tone === 'accent'
      ? 'text-accent-text font-semibold'
      : tone === 'ok'
        ? 'text-ok font-medium'
        : value === null
          ? 'text-faint'
          : 'font-medium'

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 odd:bg-elevated/60">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm text-right ${valueClass}`}>{value ?? 'N/A'}</span>
    </div>
  )
}

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

export function AssetCard({
  asset,
  matchScore,
  showStatus = false,
  peersCents = [],
  peerLabel = 'Price against comparable listings',
}: {
  asset: Asset
  matchScore?: number
  showStatus?: boolean
  /** Asking prices this listing is compared against. */
  peersCents?: number[]
  /** What that comparison set is, in words. */
  peerLabel?: string
}) {
  return (
    <article className="rounded-xl border bg-surface p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border text-xs text-muted">
          {asset.public_id}
        </span>
        <span className="text-2xl leading-none" aria-hidden>
          {countryFlag(asset.country)}
        </span>

        <h2 className="min-w-0 flex-1 truncate text-base font-medium">{asset.title}</h2>

        <div className="flex shrink-0 items-center gap-2">
          {matchScore !== undefined && (
            <span className="rounded-full border border-accent-text px-2.5 py-0.5 text-[11px] text-accent-text">
              {matchScore}% match
            </span>
          )}
          {showStatus && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${STATE_STYLE[asset.status]}`}>
              {asset.status.toLowerCase()}
            </span>
          )}
          {asset.validated && (
            <span
              className="grid size-6 place-items-center rounded-full bg-ok-bg text-ok"
              title="Validated by the platform"
            >
              ✓
            </span>
          )}
        </div>
      </header>

      <p className="mb-3 rounded-lg bg-elevated px-3 py-1.5 text-center text-xs text-muted">
        Type of asset{' '}
        <span className="text-accent-text">
          {asset.asset_kind === 'LICENSE_ONLY' ? 'Licence only' : 'Active business'}
        </span>
      </p>

      <div className="mb-4">
        <Row label="Price" value={formatPriceShort(asset.asking_price_cents)} tone="accent" />
        <Row label="Country" value={asset.country} />
        <Row label="Type of business" value={asset.sector} />
        <Row
          label="Business status"
          value={asset.business_state === 'ACTIVE' ? 'Active' : 'Not active'}
          tone={asset.business_state === 'ACTIVE' ? 'ok' : undefined}
        />
        <Row label="Type of licence" value={asset.license_type} />
        <Row label="Employees" value={asset.employees} />
        <Row label="Year of issue" value={asset.year_of_issue} />
        <Row label="Regulatory" value={asset.regulator} />
      </div>

      {peersCents.length > 0 && (
        <div className="mb-4">
          <PriceContext
            priceCents={asset.asking_price_cents}
            peersCents={peersCents}
            label={peerLabel}
          />
        </div>
      )}

      {asset.included_activities.length > 0 && (
        <div className="mb-4 rounded-lg border border-dashed p-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-faint">Included</p>
          <div className="flex flex-wrap gap-2">
            {asset.included_activities.map((a) => (
              <span key={a} className="rounded-full border px-3 py-1 text-xs text-muted">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between border-t pt-3">
        <p className="text-xs text-faint">
          {formatDate(asset.created_at)} · {asset.views} views
        </p>
        <Link
          href={`/assets/${asset.id}`}
          className="rounded-full bg-accent px-5 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90"
        >
          View asset
        </Link>
      </footer>
    </article>
  )
}
