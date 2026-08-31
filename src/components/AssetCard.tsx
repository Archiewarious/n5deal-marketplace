import Link from 'next/link'
import { formatPriceShort, formatDate } from '@/lib/format'
import type { Asset } from '@/lib/types'

/** One field of the specification grid inside a card. */
function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border bg-field px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-faint">{label}</p>
      <p className="truncate text-sm">{value ?? 'N/A'}</p>
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
}: {
  asset: Asset
  matchScore?: number
  showStatus?: boolean
}) {
  return (
    <article className="rounded-xl border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs text-faint">Asset ID #{asset.public_id}</p>
            {asset.validated && (
              <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[10px] text-ok">
                Validated
              </span>
            )}
            {showStatus && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_STYLE[asset.status]}`}
              >
                {asset.status.toLowerCase()}
              </span>
            )}
            {matchScore !== undefined && (
              <span className="rounded-full border border-accent px-2 py-0.5 text-[10px] text-accent">
                {matchScore}% match
              </span>
            )}
          </div>
          <h2 className="truncate text-base font-medium">{asset.title}</h2>
        </div>

        <div className="shrink-0 rounded-lg border px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-faint">Asking price</p>
          <p className="text-lg font-semibold">{formatPriceShort(asset.asking_price_cents)}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Country" value={asset.country} />
        <Field label="Type of licence" value={asset.license_type} />
        <Field label="Type of business" value={asset.sector} />
        <Field
          label="Business status"
          value={asset.business_state === 'ACTIVE' ? 'Active' : 'Not active'}
        />
        <Field
          label="Asset type"
          value={asset.asset_kind === 'LICENSE_ONLY' ? 'Licence only' : 'Active business'}
        />
        <Field label="Employees" value={asset.employees} />
        <Field label="Year of issue" value={asset.year_of_issue} />
        <Field label="Regulatory" value={asset.regulator} />
      </div>

      {asset.included_activities.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-faint">Included</span>
          {asset.included_activities.slice(0, 4).map((a) => (
            <span key={a} className="rounded-full border px-2.5 py-1 text-xs text-muted">
              {a}
            </span>
          ))}
          {asset.included_activities.length > 4 && (
            <span className="text-xs text-faint">+{asset.included_activities.length - 4}</span>
          )}
        </div>
      )}

      {asset.description && (
        <p className="mb-4 line-clamp-2 text-sm text-muted">{asset.description}</p>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <p className="text-xs text-faint">
          {formatDate(asset.created_at)} · {asset.views} views
        </p>
        <Link
          href={`/assets/${asset.id}`}
          className="rounded-full border px-4 py-1.5 text-xs transition hover:border-accent hover:text-accent"
        >
          View asset
        </Link>
      </div>
    </article>
  )
}
