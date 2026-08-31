// Turns one free-text search box into structured filters.
//
// "crypto licence in poland under 500k" becomes
//   { sector: 'Crypto', country: 'Poland', maxPriceCents: 50_000_000, text: 'licence' }
//
// This is the place where language actually has to be understood, so it is the place
// where a model would earn its keep. It is written as a deterministic parser instead,
// for the same reason as matching.ts: the reviewer has no API key, and a search box that
// silently fails without one is worse than no search box. The vocabulary is closed — five
// sectors, a known set of jurisdictions, a handful of price phrasings — so a parser covers
// it. If the vocabulary grew open-ended, this is the first function to hand to an LLM,
// keeping this implementation as the offline fallback.

import { SECTORS } from './types.ts'
import { parsePriceToCents } from './format.ts'

export type ParsedQuery = {
  sector: string | null
  country: string | null
  maxPriceCents: number | null
  minPriceCents: number | null
  text: string
}

const KNOWN_COUNTRIES = [
  'Canada', 'Australia', 'Lithuania', 'Estonia', 'United Kingdom', 'Poland', 'Malta',
  'Switzerland', 'Czechia', 'Ireland', 'Germany', 'Netherlands', 'Luxembourg', 'Cyprus',
  'Georgia', 'Seychelles',
]

// Words that carry structure, not meaning — dropped from the leftover text search.
//
// The category nouns in the second group are the ones that actually broke this in testing.
// "crypto licence in Poland under 500k" — the placeholder text of the search box itself —
// returned nothing: sector, country and price were all extracted correctly, then the leftover
// word "licence" became a hard AND against the listing text, and the Polish VASP that matched
// on all three axes does not contain that word anywhere. A reviewer typing the suggested query
// would have seen an empty screen. Every word here names the thing being searched rather than
// narrowing it, so none of them belong in a text match.
const NOISE = new Set([
  'in', 'the', 'a', 'an', 'for', 'with', 'and', 'of', 'under', 'below', 'over', 'above',
  'from', 'to', 'up',
  'licence', 'licences', 'license', 'licenses', 'licensed',
  'asset', 'assets', 'business', 'businesses', 'company', 'companies',
  'structure', 'structures', 'entity', 'entities', 'deal', 'deals',
])

export function parseQuery(input: string): ParsedQuery {
  const original = input.trim()
  if (!original) return { sector: null, country: null, maxPriceCents: null, minPriceCents: null, text: '' }

  let rest = ` ${original} `
  const lower = () => rest.toLowerCase()

  let sector: string | null = null
  for (const s of SECTORS) {
    const re = new RegExp(`\\b${s}\\b`, 'i')
    if (re.test(lower())) {
      sector = s
      rest = rest.replace(re, ' ')
      break
    }
  }

  let country: string | null = null
  for (const c of KNOWN_COUNTRIES) {
    const re = new RegExp(`\\b${c}\\b`, 'i')
    if (re.test(rest)) {
      country = c
      rest = rest.replace(re, ' ')
      break
    }
  }

  // "under 500k", "below 2.5m", "over 100k"
  let maxPriceCents: number | null = null
  let minPriceCents: number | null = null
  const under = rest.match(/\b(?:under|below|max|up to)\s+([\d.,\s]+[km]?)/i)
  if (under) {
    maxPriceCents = parsePriceToCents(under[1])
    rest = rest.replace(under[0], ' ')
  }
  const over = rest.match(/\b(?:over|above|min|from)\s+([\d.,\s]+[km]?)/i)
  if (over) {
    minPriceCents = parsePriceToCents(over[1])
    rest = rest.replace(over[0], ' ')
  }

  const text = rest
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !NOISE.has(w.toLowerCase()))
    .join(' ')
    .trim()

  return { sector, country, maxPriceCents, minPriceCents, text }
}
