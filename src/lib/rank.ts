/**
 * Where one asking price sits among comparable ones, as a percentage.
 *
 * The card used to answer this with a two-hundred-pixel chart: eleven bars, two axis labels and a
 * caption, to deliver one sentence. On a card the ranking is the finding and the distribution is
 * decoration, so the chart shrinks to a track with a marker and this function is the number under
 * it. The detail page still draws the full chart, where there is room for the shape as well.
 *
 * Defined as the share of the comparison set that is strictly cheaper, which makes the cheapest
 * listing 0 and the dearest 100 — and makes ties honest: three listings at the same price are all
 * "dearer than" the same set, rather than being ordered by whatever the sort happened to do.
 *
 * `peers` is expected to include this listing, because it comes from a query for the sector. It
 * does not have to, and the arithmetic is the same either way: the divisor is the number of OTHER
 * listings, so a set of one leaves nothing to compare against and the answer is null.
 */
export function pricePercentile(cents: number, peers: number[]): number | null {
  const others = peers.length - (peers.includes(cents) ? 1 : 0)
  if (others < 1) return null
  const cheaper = peers.filter((p) => p < cents).length
  return Math.round((cheaper / others) * 100)
}
