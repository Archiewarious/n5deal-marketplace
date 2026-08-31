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

  const next: UserStatus = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'

  async function toggle() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', userId)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button
        onClick={toggle}
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
