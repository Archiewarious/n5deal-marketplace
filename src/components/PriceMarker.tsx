import { pricePercentile } from '@/lib/rank'
import type { T } from '@/lib/i18n'

/**
 * The price chart at the size the sentence it delivers deserves.
 *
 * The full chart spends eleven bars, two axis labels and two hundred vertical pixels to say where
 * this price sits in the range of comparable ones. At card size the position is the whole finding,
 * so it becomes a track with a marker on it, and the number is written out beside it — the graphic
 * is never the only carrier of the fact, which also means it survives being small, being greyscale
 * and being read by someone who is not looking closely.
 *
 * The detail page keeps the real chart. There the shape of the distribution is worth the room.
 */
export function PriceMarker({
  priceCents,
  peersCents,
  t,
}: {
  priceCents: number
  peersCents: number[]
  t: T
}) {
  const pct = pricePercentile(priceCents, peersCents)
  if (pct === null) return null

  return (
    <span className="flex items-center gap-2.5">
      <span className="relative block h-1 w-16 shrink-0 rounded-full bg-muted/25" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-accent-text/50"
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-text ring-2 ring-surface"
          style={{ left: `${pct}%` }}
        />
      </span>
      <span className="text-xs text-muted">
        {pct === 0 ? t('card.cheapestHere') : t('card.dearerThan', { n: pct })}
      </span>
    </span>
  )
}
