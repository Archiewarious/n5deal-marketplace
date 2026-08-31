import 'server-only'
import { SECTORS } from './types'
import type { ParsedQuery } from './parseQuery'

/**
 * The two places a model earns its keep here, and the rules that keep it from being load-bearing.
 *
 * Both features degrade to something that works: search falls back to the deterministic parser
 * in parseQuery.ts, and the listing review simply does not appear. That is the point. A reviewer
 * cloning this repo has no key, and a prototype whose search box breaks without one is worse
 * than a prototype with a rules-based search box.
 *
 * `server-only` is not decoration: the key is `GEMINI_API_KEY`, with no NEXT_PUBLIC_ prefix, and
 * this import makes a build fail loudly rather than shipping it to a browser bundle by accident.
 */

const MODEL = 'gemini-3.6-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY)

/**
 * A search box is typed into repeatedly and the same phrase comes back constantly — the
 * placeholder query alone will be run by every reviewer. This is a plain Map with a cap rather
 * than a cache library because the process is short-lived and the cost of a miss is one cheap
 * call. On more than one instance it stops being a cache and starts being a per-instance cache,
 * which is fine for what it is and would not be for a real workload.
 * ponytail: in-process, per-instance; Redis or unstable_cache if this ever runs at scale.
 */
const cache = new Map<string, unknown>()
const CACHE_MAX = 200

function remember<T>(key: string, value: T): T {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, value)
  return value
}

type Schema = Record<string, unknown>

async function ask<T>(prompt: string, schema: Schema, timeoutMs = 6000): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  // Every call is bounded. A model that is slow today must not make the catalogue slow today:
  // the caller already has an answer from the deterministic path before this is awaited.
  const abort = AbortController ? new AbortController() : null
  const timer = abort ? setTimeout(() => abort.abort(), timeoutMs) : null

  try {
    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort?.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          // Both jobs here are extraction, not reasoning, and a search box that thinks for four
          // seconds is a search box nobody waits for.
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') return null
    return JSON.parse(text) as T
  } catch {
    // A timeout, a network failure, a quota wall, malformed JSON. All of them mean the same
    // thing to the caller — there is no model answer — and none of them should reach a user.
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ── Smart search ────────────────────────────────────────────────────────────

const QUERY_SCHEMA: Schema = {
  type: 'object',
  properties: {
    // The enum has no empty member: the API rejects an empty string in one, and "omit the
    // field" is the right shape for "the query names no sector" anyway. Only `reading` is
    // required, so every other field is genuinely optional.
    sector: { type: 'string', enum: [...SECTORS] },
    country: { type: 'string' },
    maxEur: { type: 'number' },
    minEur: { type: 'number' },
    text: { type: 'string' },
    reading: { type: 'string' },
  },
  required: ['reading'],
}

export type AiQuery = ParsedQuery & { reading: string }

/**
 * What the deterministic parser cannot do is language. It knows "under 500k" and it knows the
 * five sector names; it does not know that "somewhere I can passport into the EU" is a
 * jurisdiction filter, or that "a licence I can run without hiring anyone" means a dormant
 * entity. This reads the sentence; parseQuery stays underneath it as the floor.
 */
export async function parseQueryWithAI(
  input: string,
  countries: string[],
): Promise<AiQuery | null> {
  const q = input.trim()
  if (q.length < 3) return null

  const cacheKey = `q:${q}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) as AiQuery | null

  const out = await ask<{
    sector?: string
    country?: string
    maxEur?: number
    minEur?: number
    text?: string
    reading: string
  }>(
    `You turn one search box into filters for a marketplace of licensed financial entities.

Query: ${JSON.stringify(q)}

Sectors that exist: ${SECTORS.join(', ')}
Jurisdictions that exist: ${countries.join(', ')}

Rules:
- Only use a sector or a jurisdiction from the lists above. If the query names something that is
  not on a list, OMIT that field entirely rather than guessing at the nearest one. Omitting is
  always better than a wrong guess: a wrong filter hides listings the person wanted.
- Prices are euros. "500k" is 500000, "2.5m" is 2500000.
- "text" is AT MOST TWO WORDS, and only a distinctive term that would appear verbatim in a
  listing, like "SEPA" or "dormant". Omit it entirely if the filters already cover the query.
  Never echo the query into it, and never put a sector name, a country name or a price in it.
  It is applied as a literal substring match, so a wrong word here returns nothing.
- "reading" is a LABEL, not a sentence: at most eight words, naming the filters you applied.
  Good: "Crypto licences in Poland under €500K". Bad: anything that explains, advises, or
  mentions regulation. It is shown back to the person who typed the query so they can see
  whether you understood them.`,
    QUERY_SCHEMA,
  )

  if (!out?.reading) return remember(cacheKey, null)

  // Everything below distrusts the model, because the prompt is a request and the schema is the
  // only part of it the API enforces.
  //
  // Both of these fired in testing on the first query tried. Asked for a label of at most eight
  // words it returned a paragraph about MiCA; asked for at most two distinctive words in "text"
  // it echoed the whole query back, which would then have been applied as a literal substring
  // match and returned an empty catalogue.
  const country = countries.find((c) => c.toLowerCase() === (out.country ?? '').toLowerCase())
  const sector = SECTORS.find((s) => s === out.sector) ?? null

  const rawText = (out.text ?? '').trim()
  const text = rawText.split(/\s+/).filter(Boolean).length <= 2 && rawText.length <= 24 ? rawText : ''

  const words = out.reading.trim().split(/\s+/)
  const reading = words.length <= 10 ? words.join(' ') : words.slice(0, 10).join(' ') + '…'

  return remember(cacheKey, {
    sector,
    country: country ?? null,
    maxPriceCents: typeof out.maxEur === 'number' && out.maxEur > 0 ? out.maxEur * 100 : null,
    minPriceCents: typeof out.minEur === 'number' && out.minEur > 0 ? out.minEur * 100 : null,
    text,
    reading,
  })
}

// ── Smart validation ────────────────────────────────────────────────────────

const REVIEW_SCHEMA: Schema = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          severity: { type: 'string', enum: ['contradiction', 'gap'] },
          note: { type: 'string' },
        },
        required: ['field', 'severity', 'note'],
      },
    },
  },
  required: ['notes'],
}

export type ListingNote = {
  field: string
  severity: 'contradiction' | 'gap'
  note: string
}

/**
 * Reads a draft listing the way a platform manager would before it goes live.
 *
 * The useful failure here is not a missing field — the form already marks those required. It is
 * a description that disagrees with the structured data: prose saying "EMI with SEPA access" on
 * a row whose sector is Crypto, or "twelve staff" against an empty employees field. A buyer
 * filters on the structured half and reads the prose half, so a contradiction between them
 * hides the listing from the people it would have suited.
 *
 * Advisory only. Nothing here blocks a publish: the seller knows their own entity better than a
 * model does, and a validator that refuses to save is a validator people learn to work around.
 */
export async function reviewListing(listing: {
  title: string
  description: string
  country: string
  sector: string
  license_type: string
  regulator: string
  asset_kind: string
  business_state: string
  year_of_issue: string
  employees: string
  price: string
  included_activities: string
}): Promise<ListingNote[]> {
  const cacheKey = `r:${JSON.stringify(listing)}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) as ListingNote[]

  const out = await ask<{ notes: ListingNote[] }>(
    `You are checking a draft listing on a marketplace for licensed financial entities, before it
goes live. Report only what is wrong or missing in a way that would cost the seller a buyer.

Listing:
${JSON.stringify(listing, null, 1)}

Report two kinds of thing and nothing else:
- "contradiction": the description says something the structured fields disagree with. Quote both.
- "gap": a fact the description states that a structured field was left empty for, so buyers
  filtering on that field will never see this listing.

Do not comment on style, wording, length or price level. Do not invent facts about the entity.
Do not report a field as missing if the description does not mention it either — an empty
Employees field on a licence-only shell is normal, not a gap.
If nothing qualifies, return an empty list. Each note is one sentence, addressed to the seller.
"field" is the form label it concerns, e.g. "Sector", "Employees", "Type of licence".`,
    REVIEW_SCHEMA,
    10000,
  )

  return remember(cacheKey, out?.notes ?? [])
}
