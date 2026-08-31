'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserStatus } from '@/lib/types'

// Suspending a participant flips profiles.status. Nothing is deleted: the listings, the
// mandate and the message history stay, and the account can be restored. The effect is
// immediate and total, because is_active_user() is checked inside the RLS policies —
// a suspended buyer stops seeing published listings at the database level, not just in
// the interface.
export function ParticipantStatusControl({
  userId,
  status,
}: {
  userId: string
  status: UserStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suspending is the one action here that reaches another company, so it asks twice.
  // Restoring does not: undoing a suspension needs no ceremony.
  const [pending, setPending] = useState(false)

  const next: UserStatus = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'

  async function toggle() {
    setBusy(true)
    setError(null)
    setPending(false)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', userId)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  if (pending) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-muted">Suspend this account?</span>
        <button
          onClick={toggle}
          disabled={busy}
          autoFocus
          className="rounded-full border border-danger px-3 py-1 text-xs text-danger transition hover:bg-danger-bg disabled:opacity-50"
        >
          Yes, suspend
        </button>
        <button
          onClick={() => setPending(false)}
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
      <button
        onClick={() => (next === 'SUSPENDED' ? setPending(true) : toggle())}
        disabled={busy}
        className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
          next === 'SUSPENDED'
            ? 'text-danger hover:border-danger'
            : 'text-ok hover:border-ok'
        }`}
      >
        {next === 'SUSPENDED' ? 'Suspend' : 'Restore'}
      </button>
    </span>
  )
}
