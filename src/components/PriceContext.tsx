import { formatPriceShort } from '@/lib/format'

/**
 * Where this listing's price sits among the others in its sector.
 *
 * The reference site draws a "Market Trend 2020–2025" chart on every card. It is the right
 * instinct — a bare number tells a buyer nothing about whether it is a good one — but there is
 * no price history in this data, and inventing five years of it to make a chart look full
 * would be the one kind of dishonesty a marketplace for regulated assets cannot afford.
 *
 * This shows something the data actually supports: every published price in the same sector,
 * plotted on a log scale, with this asset marked. Asking prices here span €40K to €12.5M, so a
 * linear axis would collapse the cheap half into the left edge. The answer a buyer wants —
 * "is this priced like the others?" — is legible at a glance, and every dot is a real listing.
 */
export function PriceContext({
  priceCents,
  peersCents,
  label,
}: {
  priceCents: number
  peersCents: number[]
  /** What the comparison set is — the caller decides whether that is a sector or the catalogue. */
  label: string
}) {
  // Two listings are not a distribution, they are two dots. Say nothing rather than imply one.
  if (peersCents.length < 3) return null

  const min = Math.min(...peersCents)
  const max = Math.max(...peersCents)
  if (min === max) return null

  const lo = Math.log10(min)
  const hi = Math.log10(max)
  const at = (c: number) => ((Math.log10(c) - lo) / (hi - lo)) * 100

  const here = at(priceCents)
  const cheaper = peersCents.filter((c) => c < priceCents).length
  const share = Math.round((cheaper / peersCents.length) * 100)

  return (
    <figure className="rounded-lg border bg-field px-3 py-3">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider text-faint">
          {label}
        </span>
        <span className="text-[11px] text-muted">
          {share === 0
            ? 'the cheapest of them'
            : share === 100
              ? 'the most expensive'
              : `more than ${share}% of them`}
        </span>
      </figcaption>

      <div className="relative h-9">
        {/* axis */}
        <div className="absolute inset-x-0 top-4 h-px bg-line" />

        {peersCents.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="absolute top-[13px] size-1.5 -translate-x-1/2 rounded-full bg-muted/40"
            style={{ left: `${at(c)}%` }}
          />
        ))}

        <span
          className="absolute top-[9px] size-3.5 -translate-x-1/2 rounded-full border-2 border-accent-text bg-app"
          style={{ left: `${here}%` }}
          title={formatPriceShort(priceCents)}
        />

        <span className="absolute left-0 top-6 font-mono text-[10px] text-faint">
          {formatPriceShort(min)}
        </span>
        <span className="absolute right-0 top-6 font-mono text-[10px] text-faint">
          {formatPriceShort(max)}
        </span>
      </div>
    </figure>
  )
}
