import { formatPriceShort } from '@/lib/format'
import type { T } from '@/lib/i18n'

/**
 * Where this listing's asking price sits in the market it competes in.
 *
 * The reference site draws a "Market Trend 2020-2025" line chart on every card, and the
 * instinct is right: a bare number tells a buyer nothing about whether it is a good one. But
 * there is no price history in this data, and inventing six years of revenue to fill a chart is
 * the one kind of dishonesty a marketplace for regulated assets cannot afford.
 *
 * So the chart answers the question the data can actually answer: every comparable listing as a
 * bar, sorted, with this one filled in. Asking prices span €40K to €12.5M, which is two and a
 * half orders of magnitude — on a linear axis the cheap half collapses into the floor, so the
 * scale is logarithmic and the gridlines say so by being decades apart. Every bar is a real
 * listing a buyer can go and open.
 */
export function PriceChart({
  t,
  priceCents,
  peersCents,
  label,
}: {
  t: T
  priceCents: number
  peersCents: number[]
  /** What the comparison set is — the caller decides whether that is a sector or the catalogue. */
  label: string
}) {
  // Two listings are not a distribution, they are two bars. Say nothing rather than imply one.
  if (peersCents.length < 3) return null

  const min = Math.min(...peersCents)
  const max = Math.max(...peersCents)
  if (min === max) return null

  // Pad the axis by a fifth of a decade at each end so the shortest bar is still a bar and the
  // tallest does not touch the ceiling.
  const lo = Math.log10(min) - 0.2
  const hi = Math.log10(max) + 0.2
  const height = (c: number) => ((Math.log10(c) - lo) / (hi - lo)) * 100

  const sorted = [...peersCents].sort((a, b) => a - b)
  const cheaper = peersCents.filter((c) => c < priceCents).length
  const share = Math.round((cheaper / peersCents.length) * 100)

  // Gridlines on whole decades where the range allows it, otherwise at the ends and the middle.
  const decades: number[] = []
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) decades.push(10 ** e)
  const ticks = decades.length >= 2 ? decades : [min, Math.sqrt(min * max), max]

  // Only one bar is this listing, even when two listings happen to share a price.
  let markedOne = false

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted">
          {share === 0
            ? t('chart.cheapest')
            : share === 100
              ? t('chart.dearest')
              : t('chart.above', { n: share })}
        </span>
      </figcaption>

      <div className="flex gap-3">
        <div className="relative h-40 w-14 shrink-0">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 font-mono text-[10px] text-faint"
              style={{ bottom: `${height(tick)}%` }}
            >
              {formatPriceShort(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-40 min-w-0 flex-1">
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-line/70"
              style={{ bottom: `${height(tick)}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[3px]">
            {sorted.map((c, i) => {
              const isThis = !markedOne && c === priceCents
              if (isThis) markedOne = true
              return (
                <span
                  key={i}
                  title={formatPriceShort(c)}
                  className={`grow min-w-0 flex-1 rounded-t-sm ${
                    isThis ? 'bg-accent-text' : 'bg-elevated'
                  }`}
                  // The distribution draws itself left to right, so the eye follows the shape
                  // rather than arriving at it. Capped, or a wide set would still be growing
                  // after the reader has moved on.
                  style={{ height: `${height(c)}%`, animationDelay: `${Math.min(i, 24) * 22}ms` }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 pl-[4.25rem] font-mono text-[10px] text-faint">
        {t('chart.axis', { n: peersCents.length })}
      </p>
    </figure>
  )
}
