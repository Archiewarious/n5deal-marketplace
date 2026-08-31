'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useT } from '@/components/LocaleProvider'

export function BuyerFilters({
  sectors,
  jurisdictions,
}: {
  sectors: string[]
  jurisdictions: string[]
}) {
  const t = useT()
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
          placeholder={t('buyers.searchBuyers')}
          className="min-w-48 flex-1 rounded-full border bg-field px-4 py-2 text-sm"
          aria-label={t('buyers.searchBuyers')}
        />
      </form>

      <select
        value={params.get('sector') ?? ''}
        onChange={(e) => apply({ sector: e.target.value })}
        className="rounded-lg border bg-field px-3 py-2 text-sm"
        aria-label={t('buyers.sectorOfInterest')}
      >
        <option value="">{t('buyers.anySector')}</option>
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
        aria-label={t('buyers.jurisdictionOfInterest')}
      >
        <option value="">{t('filters.anyJurisdiction')}</option>
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
          {t('filters.reset')}
        </button>
      )}
    </div>
  )
}
