import Link from 'next/link'
import { formatPriceShort, formatDate } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { PriceContext } from './PriceContext'
import type { Asset } from '@/lib/types'

// A listing card, in three registers rather than one.
//
// The first version was eight identical label/value rows separated only by an odd/even tint,
// which is how the reference site prints a specification and is genuinely the right shape for
// a detail page. In a column of fourteen cards it is the wrong shape: everything carried the
// same weight, so the price — the one number a buyer scans for — sat between "Country" and
// "Type of business" in the same size and colour as both.
//
// So: an identity line under the title for the three facts that say what this is (jurisdiction,
// sector, whether it trades), the price given the whole width it deserves with its position
// among comparable listings underneath it, and the remaining specification as a compact grid
// that reads as reference material rather than as prose.
//
// The order is deliberate: what → how much → the details. A buyer who has decided from the
// first two lines never has to read the third.

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className={`truncate text-sm ${value === null ? 'text-faint' : 'text-fg'}`}>
        {value ?? 'N/A'}
      </dd>
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
  linked = true,
}: {
  asset: Asset
  matchScore?: number
  showStatus?: boolean
  /** Off for the live preview in the editor, where the row does not exist yet. */
  linked?: boolean
  /** Asking prices this listing is compared against. */
  peersCents?: number[]
  /** What that comparison set is, in words. */
  peerLabel?: string
}) {
  const active = asset.business_state === 'ACTIVE'

  return (
    // `relative` plus a stretched link on the title makes the whole card clickable. A listing
    // that only responds on one small button is the kind of thing people click three times
    // before giving up on.
    <article className="group relative overflow-hidden rounded-xl border bg-surface transition-colors hover:border-accent-text/50">
      <div className="p-5">
        <header className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs text-muted">
            {asset.public_id}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-medium">
              {linked ? (
                <Link href={`/assets/${asset.id}`} className="after:absolute after:inset-0">
                  {asset.title}
                </Link>
              ) : (
                asset.title
              )}
            </h2>

            {/* The three facts that answer "what is this" before any number does. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <CountryTag country={asset.country} />
              <span className="text-muted">{asset.country}</span>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span className="text-muted">{asset.sector}</span>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span className={active ? 'text-ok' : 'text-faint'}>
                {asset.asset_kind === 'LICENSE_ONLY' ? 'Licence only' : 'Active business'}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {matchScore !== undefined && (
              <span className="rounded-full border border-accent-text px-2.5 py-0.5 font-mono text-[11px] text-accent-text">
                {matchScore}% match
              </span>
            )}
            {showStatus && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${STATE_STYLE[asset.status]}`}
              >
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
      </div>

      {/* The price, and where it sits among its peers. One band, because the second question a
          buyer asks about a number is always whether it is a normal one. */}
      <div className="border-y bg-field/60 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-mono text-2xl font-medium tabular-nums text-accent-text">
            {formatPriceShort(asset.asking_price_cents)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-faint">Asking price</p>
        </div>

        {peersCents.length > 0 && (
          <div className="mt-3">
            <PriceContext
              priceCents={asset.asking_price_cents}
              peersCents={peersCents}
              label={peerLabel}
            />
          </div>
        )}
      </div>

      <div className="p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Fact label="Type of licence" value={asset.license_type} />
          <Fact label="Regulator" value={asset.regulator} />
          <Fact label="Year of issue" value={asset.year_of_issue} />
          <Fact label="Employees" value={asset.employees} />
        </dl>

        {asset.included_activities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {asset.included_activities.map((a) => (
              <span key={a} className="rounded-full border px-3 py-1 text-xs text-muted">
                {a}
              </span>
            ))}
          </div>
        )}

        <footer className="mt-4 flex items-center justify-between border-t pt-3">
          <p className="font-mono text-xs text-faint">
            {formatDate(asset.created_at)} · {asset.views} views
          </p>
          {linked && (
            <Link
              href={`/assets/${asset.id}`}
              className="relative rounded-full bg-accent px-5 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90"
            >
              View asset
            </Link>
          )}
        </footer>
      </div>
    </article>
  )
}
