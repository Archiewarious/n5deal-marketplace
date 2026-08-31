import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiEnabled, parseQueryWithAI } from '@/lib/ai'
import { getLocale } from '@/lib/locale'

/**
 * Reads a search box, once, at the moment it is submitted.
 *
 * The first version of this ran inside the catalogue's server component, and it was wrong in a
 * way worth recording: a model call is roughly two seconds, so every render of a searched
 * catalogue paid it — the back button, a filter chip, a sort change, all of it — and a render
 * that overran the abort budget silently lost the model's answer and fell back to the parser.
 * Measured at 6.8s against a 6s timeout, which is the worst of both: slow AND no result.
 *
 * Moving it here fixes three things at once. The catalogue render is deterministic and fast
 * again. The cost is paid once per search rather than once per view. And the resolved filters
 * land in the URL, so a search someone shares carries what was understood rather than a sentence
 * the next person's model might read differently.
 *
 * The route is behind the same session check as everything else: the middleware redirects an
 * anonymous caller, so this cannot be used as an open proxy to the key.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ ok: false }, { status: 401 })

  if (!aiEnabled()) return NextResponse.json({ ok: false })

  let body: { q?: unknown; countries?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const q = typeof body.q === 'string' ? body.q.slice(0, 300) : ''
  const countries = Array.isArray(body.countries)
    ? body.countries.filter((c): c is string => typeof c === 'string').slice(0, 60)
    : []

  if (q.trim().length < 3) return NextResponse.json({ ok: false })

  const parsed = await parseQueryWithAI(q, countries, await getLocale())
  if (!parsed) return NextResponse.json({ ok: false })

  return NextResponse.json({
    ok: true,
    sector: parsed.sector,
    country: parsed.country,
    maxEur: parsed.maxPriceCents === null ? null : Math.round(parsed.maxPriceCents / 100),
    minEur: parsed.minPriceCents === null ? null : Math.round(parsed.minPriceCents / 100),
    text: parsed.text,
    reading: parsed.reading,
  })
}
