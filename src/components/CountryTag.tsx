import {
  AU,
  CA,
  CH,
  CY,
  CZ,
  DE,
  EE,
  GB,
  GE,
  IE,
  LT,
  LU,
  MT,
  NL,
  PL,
  SC,
  SG,
  US,
} from 'country-flag-icons/string/3x2'
import { countryCode } from '@/lib/flags'

/**
 * A jurisdiction: the flag, and the code a licence is actually written with.
 *
 * This began as an emoji flag built from regional-indicator code points, which failed in the
 * most embarrassing way available: Windows ships no colour flag glyphs, so the browser fell back
 * to the raw letter pair and every card rendered two grey letters where a picture was supposed
 * to be. The reference site loads a PNG per flag from its own API.
 *
 * These are real SVG flags from `country-flag-icons`, inlined at render time. The import is
 * eighteen named exports rather than the whole set of 272, and this is a server component, so
 * nothing about it reaches the browser except the one flag on the page — no request, no sprite
 * sheet, no font gamble.
 *
 * The SVG markup is package content, not user input: `country` only ever selects which constant
 * to inline.
 */
const FLAGS: Record<string, string> = {
  AU, CA, CH, CY, CZ, DE, EE, GB, GE, IE, LT, LU, MT, NL, PL, SC, SG, US,
}

export function CountryTag({
  country,
  size = 'sm',
}: {
  country: string
  /** `lg` is the card header, where the flag is the card's only image. */
  size?: 'sm' | 'lg'
}) {
  const code = countryCode(country)
  const svg = FLAGS[code]
  const big = size === 'lg'

  return (
    <span
      title={country}
      className={`inline-flex shrink-0 items-center gap-2 ${big ? '' : 'align-middle'}`}
    >
      {svg ? (
        <span
          aria-hidden
          className={`block overflow-hidden rounded-[3px] ring-1 ring-line ${
            big ? 'w-9' : 'w-5'
          } [&>svg]:block [&>svg]:h-auto [&>svg]:w-full`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}
      <span
        className={`font-mono tracking-wider text-muted ${big ? 'text-sm' : 'text-[11px]'}`}
      >
        {code}
      </span>
    </span>
  )
}
