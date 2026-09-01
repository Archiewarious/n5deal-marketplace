import Link from 'next/link'
import { formatPriceShort, formatDate } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { PriceMarker } from '@/components/PriceMarker'
import { sectorTone } from '@/lib/sector'
import type { Asset } from '@/lib/types'
import type { T } from '@/lib/i18n'

// The listing card, built from the licence rather than from the columns of the table.
//
// It was the reference site's card first: nine label/value rows in bordered boxes, two tinted
// panels and a chart, about 680 pixels tall. That shape survived three revisions and was wrong in
// all of them, for reasons that only became sayable once four versions were put side by side:
//
//   Every fact sat at one weight, so there was no entry point and nothing could be found.
//   A bordered box per field is a spreadsheet idiom. It reads "row of data", not "licence".
//   Country and sector were printed twice — once as the flag and the chip, again as two rows.
//   The thing a buyer is actually shopping for, what the licence permits, was the smallest and
//     greyest item on the card.
//   Two hundred pixels of chart delivered one sentence: dearer than most comparable listings.
//   And nothing on it belonged to this subject. Change the words and it sells second-hand cars.
//
// So the hierarchy now follows what the object is. A licence is an instrument issued by a named
// authority, in a named jurisdiction, granting named permissions, on a date. Issuer and
// jurisdiction are the eyebrow, because that pair IS the product — nobody buys "a payment
// institution", they buy a German one licensed by BaFin. The title follows. Under it one line of
// mono does the work of four bordered boxes, set the way a registration is printed on the
// document itself. The permissions take the middle at reading size. Price, and where it sits
// among comparable listings, close the card.
//
// 215 pixels against 680, and nothing was dropped except the two rows that said what the header
// had already said.

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

/** The platform's own check on a listing, drawn as a seal rather than as a bare tick. */
function ValidatedSeal({ t }: { t: T }) {
  return (
    <span
      title={t('card.validatedTitle')}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok ring-1 ring-ok/30"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {t('card.validated')}
    </span>
  )
}

/**
 * One line of the licence, set the way a registration is printed on the document itself.
 *
 * Everything here was a bordered label/value box a moment ago. As a row of slash-separated terms
 * in mono it is one line instead of four, and it reads as a citation rather than as a table —
 * which is what it is. Nulls drop out entirely; a box saying "Employees: N/A" is a box spent on
 * nothing.
 */
function Credentials({ asset, t }: { asset: Asset; t: T }) {
  const tone = sectorTone(asset.sector)
  const parts: React.ReactNode[] = [
    <span key="lic" className={`font-medium ${tone.text}`}>
      {asset.license_type}
    </span>,
    <span key="sec">{asset.sector}</span>,
  ]
  if (asset.year_of_issue !== null)
    parts.push(
      <span key="yr">
        {t('card.inForce')} {asset.year_of_issue}
      </span>,
    )
  if (asset.employees !== null) parts.push(<span key="fte">{asset.employees} FTE</span>)
  parts.push(
    <span key="st" className={asset.business_state === 'ACTIVE' ? 'text-ok' : 'text-faint'}>
      {asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive')}
    </span>,
  )

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-x-2">
          {i > 0 && (
            <span aria-hidden className="text-faint">
              /
            </span>
          )}
          {p}
        </span>
      ))}
    </p>
  )
}

/** What the licence lets its holder do. On this card that is the product, so it is the middle. */
function Permits({ asset, t }: { asset: Asset; t: T }) {
  const tone = sectorTone(asset.sector)
  if (asset.included_activities.length === 0) return null
  return (
    <div className="mt-5 border-t pt-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-faint">{t('card.permits')}</p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
        {asset.included_activities.map((a) => (
          <li key={a} className="flex items-center gap-2 text-sm">
            <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${tone.text}`} aria-hidden>
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
    </div>
  )
}

// A dictionary and a locale tag rather than getT(), because AssetForm renders this card as a live
// preview on the client, and importing @/lib/locale there would pull `server-only` into a client
// module graph and fail the build. A prop is also the honest shape: the card is a pure function
// of a listing and a dictionary.
export function AssetCard({
  asset,
  t,
  tag = 'en-GB',
  matchScore,
  showStatus = false,
  peersCents = [],
  linked = true,
}: {
  asset: Asset
  t: T
  /** Intl tag, so a price and a date follow the language the page is in. */
  tag?: string
  matchScore?: number
  showStatus?: boolean
  /** Off for the live preview in the editor, where the row does not exist yet. */
  linked?: boolean
  /** Asking prices this listing is compared against. */
  peersCents?: number[]
}) {
  const tone = sectorTone(asset.sector)

  return (
    // `relative` plus a stretched link on the title makes the whole card clickable. A listing
    // that only responds on one small button is the kind of thing people click three times
    // before giving up on.
    <article className="group relative overflow-hidden rounded-xl border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-text/40 hover:shadow-lg hover:shadow-black/5">
      {/* The sector hue as a header rule, where a document's rule goes, rather than as the left
          bar every listing card in every marketplace has. */}
      <span aria-hidden className={`block h-[3px] w-full ${tone.dot}`} />

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">
              {t('card.issuedBy')}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CountryTag country={asset.country} size="lg" />
              <span className="text-sm font-medium">{asset.regulator ?? t('card.na')}</span>
              <span className="text-sm text-muted">· {asset.country}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {matchScore !== undefined && (
              <span className="rounded-full border border-accent-text px-2.5 py-1 font-mono text-[11px] text-accent-text">
                {t('card.match', { n: matchScore })}
              </span>
            )}
            {showStatus && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${STATE_STYLE[asset.status]}`}>
                {t(STATE_KEY[asset.status])}
              </span>
            )}
            {asset.validated && <ValidatedSeal t={t} />}
            <span className="font-mono text-xs text-faint">№{asset.public_id}</span>
          </div>
        </div>

        <h2 className="heading mt-4 text-[22px] font-semibold leading-[1.2] sm:text-2xl">
          {linked ? (
            <Link href={`/assets/${asset.id}`} className="after:absolute after:inset-0">
              {asset.title}
            </Link>
          ) : (
            asset.title
          )}
        </h2>

        <Credentials asset={asset} t={t} />
        <Permits asset={asset} t={t} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t bg-elevated/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-mono text-2xl font-medium tabular-nums text-accent-text">
            {formatPriceShort(asset.asking_price_cents)}
          </p>
          <PriceMarker t={t} priceCents={asset.asking_price_cents} peersCents={peersCents} />
        </div>

        <div className="flex items-center gap-4">
          <p className="hidden font-mono text-xs text-faint sm:block">
            {formatDate(asset.created_at, tag)} · {asset.views} {t('card.views')}
          </p>
          {linked && (
            <Link
              href={`/assets/${asset.id}`}
              className="relative whitespace-nowrap rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              {t('card.viewAsset')}
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}
