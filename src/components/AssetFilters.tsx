'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SECTORS } from '@/lib/types'

// Filter state lives in the URL, not in React state. That makes every filtered view
// shareable and bookmarkable, survives a refresh for free, and lets the page stay a
// server component that reads searchParams — no client-side data fetching at all.
export function AssetFilters({
  counts,
  countries,
}: {
  counts: Record<string, number>
  countries: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  useEffect(() => {
    setQ(params.get('q') ?? '')
  }, [params])

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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply({ q })
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: crypto licence in Poland under 500k"
          className="flex-1 rounded-full border bg-field px-4 py-2 text-sm"
          aria-label="Search assets"
        />
        <button className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => apply({ sector: null })}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            !activeSector ? 'border-accent-text text-accent-text' : 'text-muted hover:text-fg'
          }`}
        >
          All ({total})
        </button>
        {SECTORS.map((s) => (
          <button
            key={s}
            onClick={() => apply({ sector: activeSector === s ? null : s })}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              activeSector === s ? 'border-accent-text text-accent-text' : 'text-muted hover:text-fg'
            }`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={params.get('country') ?? ''}
          onChange={(e) => apply({ country: e.target.value })}
          className="rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label="Jurisdiction"
        >
          <option value="">Any jurisdiction</option>
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
          aria-label="Asset type"
        >
          <option value="">Any asset type</option>
          <option value="LICENSE_ONLY">Licence only</option>
          <option value="ACTIVE_BUSINESS">Active business</option>
        </select>

        <input
          defaultValue={params.get('max') ?? ''}
          onBlur={(e) => apply({ max: e.target.value })}
          placeholder="Max price, e.g. 2.5M"
          className="w-40 rounded-lg border bg-field px-3 py-1.5 text-sm"
          aria-label="Maximum price"
        />

        {[...params.keys()].length > 0 && (
          <button
            onClick={() => router.push(pathname)}
            className="rounded-lg px-3 py-1.5 text-sm text-faint transition hover:text-fg"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
