// ISO 3166-1 alpha-2 for the jurisdictions in the catalogue.
//
// This file used to build emoji flags from these codes by offsetting each letter into the
// regional-indicator block. That was a bad bet: Windows has no colour flag glyphs, so the
// browser fell back to the two raw letters and every card showed grey text where a flag was
// meant to be. The codes themselves are what a licence names anyway, so CountryTag sets them
// in mono and nothing depends on a font shipping an emoji.
const ISO: Record<string, string> = {
  Australia: 'AU',
  Canada: 'CA',
  Cyprus: 'CY',
  Czechia: 'CZ',
  Estonia: 'EE',
  Georgia: 'GE',
  Germany: 'DE',
  Ireland: 'IE',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  Malta: 'MT',
  Netherlands: 'NL',
  Poland: 'PL',
  Seychelles: 'SC',
  Singapore: 'SG',
  Switzerland: 'CH',
  'United Kingdom': 'GB',
  'United States': 'US',
}

/** The two-letter code itself, for places that set jurisdictions in mono rather than as a flag. */
export function countryCode(country: string): string {
  return ISO[country] ?? country.slice(0, 2).toUpperCase()
}
