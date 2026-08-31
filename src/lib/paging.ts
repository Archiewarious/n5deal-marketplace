/**
 * Turns a page number out of a URL into one that can be indexed with.
 *
 * Extracted from the catalogue and given its own tests because it is a branch on user input
 * arriving from the address bar, and the first version was wrong in a way that reads as fine:
 *
 *   const page = Math.min(pages, Math.max(1, Number(sp.page) || 1))
 *
 * That clamps the range and says nothing about the type. `Number('2.7')` is 2.7, neither Math
 * rounds, and a fractional page propagates all the way out: `slice(13.6, 21.6)` returns a window
 * straddling two pages, the result line renders "Showing 14.600000000000001–21.6", and
 * `aria-current` never matches an integer slot so no page is marked current at all.
 *
 * The parse is deliberately strict rather than lenient. `Number()` also accepts '0x2', '+2',
 * ' 3 ' and 'Infinity', all of which land inside the valid range and do no damage — but they
 * give one page several URLs, and a canonical page is worth more than a forgiving one.
 */
export function clampPage(raw: string, pages: number): number {
  const total = Math.max(1, Math.floor(pages) || 1)
  if (!/^\d+$/.test(raw.trim())) return 1
  const n = Number(raw.trim())
  if (!Number.isSafeInteger(n) || n < 1) return 1
  return Math.min(total, n)
}

/** How many pages a set of that size needs. Always at least one, so an empty list still renders. */
export const pageCount = (rows: number, perPage: number) =>
  Math.max(1, Math.ceil(rows / Math.max(1, perPage)))
