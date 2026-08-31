// Prices live in the database as whole euro cents and are only turned into a
// human string here. Nothing multiplies or divides money outside this file, which is
// what keeps rounding from drifting between the list, the card and the filters.

// One formatter per locale, built once. The currency is always EUR — the catalogue is priced in
// euros in every language — but the grouping and the symbol position are not: 2 500 000 € in
// Ukrainian and Russian, €2,500,000 in English.
const FORMATTERS = new Map<string, Intl.NumberFormat>()

function money(tag: string): Intl.NumberFormat {
  let f = FORMATTERS.get(tag)
  if (!f) {
    f = new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    FORMATTERS.set(tag, f)
  }
  return f
}

const FULL = money('en-GB')

/** €40.0K / €2.5M, the compact form N5Deal uses on listing cards. */
export function formatPriceShort(cents: number): string {
  const eur = cents / 100
  if (eur >= 1_000_000) return `€${trim(eur / 1_000_000)}M`
  if (eur >= 1_000) return `€${trim(eur / 1_000)}K`
  return FULL.format(eur)
}

/** €2,500,000 — used where the exact number matters (asset page, admin). */
export function formatPriceFull(cents: number, tag = 'en-GB'): string {
  return money(tag).format(cents / 100)
}

function trim(n: number): string {
  // 2.50 -> 2.5, 2.00 -> 2, 40.05 -> 40.1
  return n.toFixed(1).replace(/\.0$/, '')
}

/** Parses "2.5M", "40K", "1 200 000" from a filter field into cents. Returns null on junk. */
export function parsePriceToCents(input: string): number | null {
  const raw = input.trim().replace(/[\s,]/g, '').toUpperCase()
  if (!raw) return null
  const m = raw.match(/^(\d+(?:\.\d+)?)([KM])?$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n)) return null
  const mult = m[2] === 'M' ? 1_000_000 : m[2] === 'K' ? 1_000 : 1
  return Math.round(n * mult * 100)
}

export function formatDate(iso: string, tag = 'en-GB'): string {
  return new Date(iso).toLocaleDateString(tag, { month: 'short', year: 'numeric' })
}
