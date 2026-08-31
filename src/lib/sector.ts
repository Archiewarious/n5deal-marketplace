/**
 * The five categories the marketplace is organised by, each with a hue.
 *
 * This is the one place colour is allowed to multiply. It earns it because category is the first
 * thing a buyer narrows on — before jurisdiction, before price — and across thirty cards a chip
 * you can find by colour beats a word you have to read. The hues are defined once in globals.css
 * for both grounds; this file only decides which class names carry them.
 *
 * Unknown sectors fall back to the neutral pair rather than throwing: SECTORS is a constant
 * today, but a category added in the database tomorrow should render plainly, not crash a page.
 */
export const SECTOR_TONE: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  Bank: { text: 'text-bank', bg: 'bg-bank-bg', border: 'border-bank', dot: 'bg-bank' },
  Fintech: {
    text: 'text-fintech',
    bg: 'bg-fintech-bg',
    border: 'border-fintech',
    dot: 'bg-fintech',
  },
  Payment: {
    text: 'text-payment',
    bg: 'bg-payment-bg',
    border: 'border-payment',
    dot: 'bg-payment',
  },
  EMI: { text: 'text-emi', bg: 'bg-emi-bg', border: 'border-emi', dot: 'bg-emi' },
  Crypto: { text: 'text-crypto', bg: 'bg-crypto-bg', border: 'border-crypto', dot: 'bg-crypto' },
}

const NEUTRAL = { text: 'text-muted', bg: 'bg-elevated', border: 'border-line', dot: 'bg-muted' }

export const sectorTone = (sector: string) => SECTOR_TONE[sector] ?? NEUTRAL
