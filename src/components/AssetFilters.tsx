'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useT } from '@/components/LocaleProvider'
import { SECTORS } from '@/lib/types'
import { sectorTone } from '@/lib/sector'

// Filter state lives in the URL, not in React state. That makes every filtered view
// shareable and bookmarkable, survives a refresh for free, and lets the page stay a
// server component that reads searchParams — no client-side data fetching at all.
export function AssetFilters({
  counts,
  countries,
  canSortByFit = false,
  aiAvailable = false,
}: {
  counts: Record<string, number>
  countries: string[]
  /** Only a buyer has a mandate to sort against, so only a buyer is offered the option. */
  canSortByFit?: boolean
  /** Whether a key is configured. Without one the box is the deterministic parser, unchanged. */
  aiAvailable?: boolean
}) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [reading, setReading] = useState(false)

  useEffect(() => {
    setQ(params.get('q') ?? '')
  }, [params])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = q.trim()
    // One word is a term, not a sentence. The parser handles those perfectly and instantly.
    if (!aiAvailable || text.split(/\s+/).length < 3) return apply({ q: text })

    setReading(true)
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch('/api/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, countries }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const out = await res.json()
      if (!out?.ok) return apply({ q: text })

      // The resolved filters replace the SENTENCE, not the controls. Keeping the sentence would
      // filter twice — once by the model's reading and again by the parser's reading of the same
      // words — but the asset type and the sort order are things the reader set deliberately
      // with a control, the model never returns them, and an earlier version dropped both.
      const next = new URLSearchParams()
      const keep = params.get('kind')
      const sort = params.get('sort')
      if (keep) next.set('kind', keep)
      if (sort) next.set('sort', sort)
      if (out.sector) next.set('sector', out.sector)
      if (out.country) next.set('country', out.country)
      if (out.maxEur) next.set('max', String(out.maxEur))
      if (out.minEur) next.set('min', String(out.minEur))
      if (out.text) next.set('q', out.text)
      next.set('reading', out.reading)
      router.push(`${pathname}?${next.toString()}`)
    } catch {
      apply({ q: text })
    } finally {
      setReading(false)
    }
  }

  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  const activeSector = params.get('sector')
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="mb-6 grid gap-4">
      {/* Submitting asks the model to turn the sentence into filters, then puts THOSE in the
          URL — so the page that loads is deterministic and the link is shareable. Everything
          about this is optional: no key, a failure, a timeout, and it falls back to pushing the
          raw query, which the deterministic parser on the server handles exactly as before. */}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            aiAvailable
              ? t('filters.searchPlaceholderAi')
              : t('filters.searchPlaceholder')
          }
          className="flex-1 rounded-full border bg-field px-4 py-2 text-sm"
          aria-label={t('filters.searchAssets')}
        />
        <button
          disabled={reading}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {reading ? t('filters.reading') : t('filters.search')}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => apply({ sector: null })}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            !activeSector ? 'border-accent-text text-accent-text' : 'text-muted hover:text-fg'
          }`}
        >
          {t('filters.all')} ({total})
        </button>
        {/* Each category keeps its own colour whether it is selected or not, so the row of
            chips is a legend for the cards below it rather than five identical pills. */}
        {SECTORS.map((s) => {
          const tone = sectorTone(s)
          const on = activeSector === s
          return (
            <button
              key={s}
              onClick={() => apply({ sector: on ? null : s })}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
                on ? `${tone.border} ${tone.bg} ${tone.text}` : 'text-muted hover:text-fg'
              }`}
            >
              <span aria-hidden className={`size-1.5 rounded-full ${tone.dot}`} />
              {s} ({counts[s] ?? 0})
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={params.get('country') ?? ''}
          onChange={(e) => apply({ country: e.target.value })}
          className="rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label={t('filters.jurisdiction')}
        >
          <option value="">{t('filters.anyJurisdiction')}</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={params.get('kind') ?? ''}
          onChange={(e) => apply({ kind: e.target.value })}
          className="rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label={t('filters.assetType')}
        >
          <option value="">{t('filters.anyAssetType')}</option>
          <option value="LICENSE_ONLY">{t('filters.licenceOnly')}</option>
          <option value="ACTIVE_BUSINESS">{t('filters.activeBusiness')}</option>
        </select>

        <input
          // key ties the field to the URL: without it React keeps the old DOM node on Reset
          // and the cleared value creeps back on the next filter change.
          key={params.get('max') ?? ''}
          defaultValue={params.get('max') ?? ''}
          onBlur={(e) => apply({ max: e.target.value })}
          // Enter is what people press in a text field; without this it did nothing at all.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              apply({ max: e.currentTarget.value })
            }
          }}
          placeholder={t('filters.maxPrice')}
          className="w-40 rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label={t('filters.maximumPrice')}
        />

        <select
          value={params.get('sort') ?? ''}
          onChange={(e) => apply({ sort: e.target.value })}
          className="rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label={t('filters.sortOrder')}
        >
          {/* A buyer's default is their mandate; everyone else's is newest first. Saying so in
              the empty option means the select never reads as unset when it is doing something. */}
          <option value="">
            {canSortByFit ? t('filters.bestFit') : t('filters.newestFirst')}
          </option>
          {canSortByFit && <option value="new">{t('filters.newestFirst')}</option>}
          <option value="price-desc">{t('filters.priceDesc')}</option>
          <option value="price-asc">{t('filters.priceAsc')}</option>
          <option value="views">{t('filters.mostViewed')}</option>
        </select>

        {[...params.keys()].length > 0 && (
          <button
            onClick={() => router.push(pathname)}
            className="rounded-lg px-3 py-1.5 text-sm text-faint transition hover:text-fg"
          >
            {t('filters.reset')}
          </button>
        )}
      </div>
    </div>
  )
}
