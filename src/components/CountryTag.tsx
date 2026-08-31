import { countryCode } from '@/lib/flags'

/**
 * A jurisdiction, as a register writes one.
 *
 * This started as an emoji flag built from regional-indicator code points, which was wrong in
 * the most embarrassing way: Windows ships no colour flag glyphs, so the browser fell back to
 * the raw letter pair and every card rendered two grey letters where a flag was supposed to be.
 * The landing page was worse — flag followed by code came out as "LT LT".
 *
 * So: no images, no font gamble, no request. The ISO code set deliberately in mono on a tinted
 * chip, which is what the jurisdiction actually is on a licence and reads identically on every
 * platform. The full country name rides along as the title for anyone who does not read codes.
 */
export function CountryTag({ country, className = '' }: { country: string; className?: string }) {
  return (
    <span
      title={country}
      className={`inline-grid h-5 min-w-[1.75rem] shrink-0 place-items-center rounded border bg-elevated px-1 font-mono text-[11px] leading-none tracking-wider text-muted ${className}`}
    >
      {countryCode(country)}
    </span>
  )
}
