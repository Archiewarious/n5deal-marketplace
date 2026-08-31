import Link from 'next/link'
import { formatPriceShort, formatDate } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { PriceChart } from './PriceChart'
import type { Asset } from '@/lib/types'

// The listing card, laid out the way the reference site lays out its own.
//
// Their card is a specification read top to bottom: a numbered header with the flag and a
// certification seal, a "Type of Asset" band, ten label/value rows each in its own bordered box,
// a tinted Benefits panel, a tinted Asset Info panel, and a chart with real axes. That structure
// is right for this material — a licence IS a specification, and a buyer compares the same field
// down a column of cards — and the earlier attempt to make it lighter by compressing the rows
// into a four-up grid lost exactly what makes it readable.
//
// What was actually wrong was never the ledger. It was that everything sat at one weight on one
// flat surface: no picture anywhere, no panels, no chart, and stripes instead of rows. So: the
// flag is a real SVG, the rows are rows, the two tinted panels are back, and the chart plots
// data this database actually holds.

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number | null
  tone?: 'accent' | 'ok'
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-field px-4 py-2.5">
      <span className={`text-sm ${tone === 'accent' ? 'text-accent-text' : 'text-muted'}`}>
        {label}
      </span>
      <span
        className={`truncate text-right text-sm ${
          tone === 'accent'
            ? 'font-mono text-base font-medium tabular-nums text-accent-text'
            : tone === 'ok'
              ? 'font-medium text-ok'
              : value === null
                ? 'text-faint'
                : 'font-medium'
        }`}
      >
        {value ?? 'N/A'}
      </span>
    </div>
  )
}

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

/** The platform's own check on a listing, drawn as the seal it is rather than as a tick. */
function ValidatedSeal() {
  return (
    <span
      className="relative grid size-11 shrink-0 place-items-center rounded-full bg-ok-bg text-ok ring-1 ring-ok/40"
      title="Checked by the platform"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-full" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2.6 3.2"
          opacity="0.65"
        />
      </svg>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" aria-hidden>
        <path d="M5 12.5l4.2 4.2L19 7" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Validated</span>
    </span>
  )
}

export function AssetCard({
  asset,
  matchScore,
  showStatus = false,
  peersCents = [],
  peerLabel = 'Asking price against comparable listings',
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
  return (
    // `relative` plus a stretched link on the title makes the whole card clickable. A listing
    // that only responds on one small button is the kind of thing people click three times
    // before giving up on.
    <article className="group relative rounded-2xl border bg-surface p-5 transition-colors hover:border-accent-text/40 sm:p-6">
      <header className="mb-4 flex items-start gap-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border font-mono text-sm text-muted">
          {asset.public_id}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-medium leading-tight">
            {linked ? (
              <Link href={`/assets/${asset.id}`} className="after:absolute after:inset-0">
                {asset.title}
              </Link>
            ) : (
              asset.title
            )}
          </h2>
          <div className="mt-2">
            <CountryTag country={asset.country} size="lg" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {matchScore !== undefined && (
            <span className="rounded-full border border-accent-text px-3 py-1 font-mono text-[11px] text-accent-text">
              {matchScore}% match
            </span>
          )}
          {showStatus && (
            <span className={`rounded-full px-3 py-1 text-[11px] ${STATE_STYLE[asset.status]}`}>
              {asset.status.toLowerCase()}
            </span>
          )}
          {asset.validated && <ValidatedSeal />}
        </div>
      </header>

      <p className="mb-4 rounded-lg bg-elevated px-4 py-2 text-center text-xs text-muted">
        Type of asset{' '}
        <span className="text-accent-text">
          {asset.asset_kind === 'LICENSE_ONLY' ? 'Licence only' : 'Active business'}
        </span>
      </p>

      <div className="grid gap-1.5">
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
        <Row label="Regulator" value={asset.regulator} />
      </div>

      {asset.included_activities.length > 0 && (
        <section className="mt-4 rounded-xl border border-accent-text/15 bg-accent/[0.07] p-4">
          <p className="mb-3 text-xs text-accent-text">Included activities</p>
          <div className="flex flex-wrap gap-2">
            {asset.included_activities.map((a) => (
              <span
                key={a}
                className="rounded-full border bg-surface px-3 py-1.5 text-xs text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {asset.description && (
        <section className="mt-3 rounded-xl border border-accent-text/15 bg-accent/[0.07] p-4">
          <p className="mb-2 text-xs text-accent-text">Asset info</p>
          <p className="text-sm leading-relaxed text-muted">{asset.description}</p>
        </section>
      )}

      {peersCents.length >= 3 && (
        <section className="mt-4 rounded-xl border bg-field/50 p-4">
          <PriceChart
            priceCents={asset.asking_price_cents}
            peersCents={peersCents}
            label={peerLabel}
          />
        </section>
      )}

      <footer className="mt-4 flex items-center justify-between border-t pt-4">
        <p className="font-mono text-xs text-faint">
          {formatDate(asset.created_at)} · {asset.views} views
        </p>
        {linked && (
          <Link
            href={`/assets/${asset.id}`}
            className="relative rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            View asset
          </Link>
        )}
      </footer>
    </article>
  )
}
