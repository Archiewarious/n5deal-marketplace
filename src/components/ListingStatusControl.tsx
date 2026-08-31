'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ListingState } from '@/lib/types'

// One control, two callers. A seller may move their own listing between draft and
// published; a manager may suspend or remove anything. Both go through the same update,
// and RLS decides which of the two policies lets it through — the component does not
// need to know, and cannot grant itself more than the database allows.

type Option = { to: ListingState; label: string; tone?: 'danger' | 'warn'; confirm?: string }

const SUSPEND: Option = {
  to: 'SUSPENDED',
  label: 'Suspend',
  tone: 'warn',
  confirm: 'Hide this listing from every buyer?',
}
const REMOVE: Option = {
  to: 'REMOVED',
  label: 'Remove',
  tone: 'danger',
  confirm: 'Remove this listing from the platform?',
}
const RESTORE: Option = { to: 'PUBLISHED', label: 'Restore' }

// Written out per state rather than as a chain of ternaries, because the chain had a hole in
// it: REMOVED fell into the default branch and was offered Suspend and Remove again, so a
// mis-clicked Remove could only be undone by suspending first and then restoring, a two-step
// path shown nowhere. A table makes a missing transition visible.
const MANAGER_OPTIONS: Record<ListingState, Option[]> = {
  PUBLISHED: [SUSPEND, REMOVE],
  DRAFT: [REMOVE],
  SUSPENDED: [RESTORE, REMOVE],
  REMOVED: [RESTORE],
}

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
  // Which destructive option is waiting for a second click. The alternative was
  // window.confirm, which cannot be styled, reads as a browser warning rather than as part of
  // the product, and is suppressed outright in some embedded views.
  const [pending, setPending] = useState<Option | null>(null)

  const options: Option[] = owner
    ? status === 'PUBLISHED'
      ? [{ to: 'DRAFT', label: 'Unpublish' }]
      : status === 'DRAFT'
        ? [{ to: 'PUBLISHED', label: 'Publish' }]
        : []
    : MANAGER_OPTIONS[status]

  async function move(to: ListingState) {
    setBusy(true)
    setError(null)
    setPending(null)
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

  if (pending) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-muted">{pending.confirm}</span>
        <button
          onClick={() => move(pending.to)}
          disabled={busy}
          autoFocus
          className="rounded-full border border-danger px-3 py-1 text-xs text-danger transition hover:bg-danger-bg disabled:opacity-50"
        >
          Yes, {pending.label.toLowerCase()}
        </button>
        <button
          onClick={() => setPending(null)}
          className="rounded-full border px-3 py-1 text-xs text-muted transition hover:text-fg"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {options.map((o) => (
        <button
          key={o.to + o.label}
          onClick={() => (o.confirm ? setPending(o) : move(o.to))}
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
