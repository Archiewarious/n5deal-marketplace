// Country flags as emoji, built from the ISO 3166-1 alpha-2 code by offsetting each
// letter into the regional-indicator block. No image assets, no external requests, and it
// degrades to an empty string for a country the map does not know rather than to a broken
// image. The listing card leans on the flag for instant jurisdiction recognition, which is
// the first thing a buyer filters on.
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

export function countryFlag(country: string): string {
  const code = ISO[country]
  if (!code) return '🏳'
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
