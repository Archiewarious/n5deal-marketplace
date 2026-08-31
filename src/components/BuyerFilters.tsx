'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function BuyerFilters({
  sectors,
  jurisdictions,
}: {
  sectors: string[]
  jurisdictions: string[]
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

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply({ q })
        }}
        className="flex flex-1 gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search buyers"
          className="min-w-48 flex-1 rounded-full border bg-field px-4 py-2 text-sm"
          aria-label="Search buyers"
        />
      </form>

      <select
        value={params.get('sector') ?? ''}
        onChange={(e) => apply({ sector: e.target.value })}
        className="rounded-lg border bg-field px-3 py-2 text-sm"
        aria-label="Sector of interest"
      >
        <option value="">Any sector</option>
        {sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={params.get('jurisdiction') ?? ''}
        onChange={(e) => apply({ jurisdiction: e.target.value })}
        className="rounded-lg border bg-field px-3 py-2 text-sm"
        aria-label="Jurisdiction of interest"
      >
        <option value="">Any jurisdiction</option>
        {jurisdictions.map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </select>

      {[...params.keys()].length > 0 && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded-lg px-3 py-2 text-sm text-faint transition hover:text-fg"
        >
          Reset
        </button>
      )}
    </div>
  )
}
