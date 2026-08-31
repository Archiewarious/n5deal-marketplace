'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ListingState } from '@/lib/types'

// One control, two callers. A seller may move their own listing between draft and
// published; a manager may suspend or remove anything. Both go through the same update,
// and RLS decides which of the two policies lets it through — the component does not
// need to know, and cannot grant itself more than the database allows.
export function ListingStatusControl({
  assetId,
  status,
  owner = false,
}: {
  assetId: string
  status: ListingState
  owner?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options: { to: ListingState; label: string; tone?: 'danger' | 'warn' }[] = owner
    ? status === 'PUBLISHED'
      ? [{ to: 'DRAFT', label: 'Unpublish' }]
      : status === 'DRAFT'
        ? [{ to: 'PUBLISHED', label: 'Publish' }]
        : []
    : status === 'SUSPENDED'
      ? [
          { to: 'PUBLISHED', label: 'Restore' },
          { to: 'REMOVED', label: 'Remove', tone: 'danger' },
        ]
      : [
          { to: 'SUSPENDED', label: 'Suspend', tone: 'warn' },
          { to: 'REMOVED', label: 'Remove', tone: 'danger' },
        ]

  async function move(to: ListingState) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('assets').update({ status: to }).eq('id', assetId)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  if (options.length === 0) return null

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      {options.map((o) => (
        <button
          key={o.to}
          onClick={() => move(o.to)}
          disabled={busy}
          className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
            o.tone === 'danger'
              ? 'text-danger hover:border-danger'
              : o.tone === 'warn'
                ? 'text-warn hover:border-warn'
                : 'text-muted hover:border-accent-text hover:text-accent-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </span>
  )
}
