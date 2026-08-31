'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Contacting the other side is a single insert. The RLS policy checks that from_user_id
// is the caller and that the caller is active, so a suspended account cannot send
// messages even if this form were bypassed entirely.
export function ContactForm({
  toUserId,
  toName,
  assetId,
  disabled = false,
}: {
  toUserId: string
  toName: string
  assetId?: string
  disabled?: boolean
}) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const from = userData.user?.id
    if (!from) {
      setError('Session expired. Sign in again.')
      setState('error')
      return
    }

    const { error } = await supabase.from('contact_requests').insert({
      from_user_id: from,
      to_user_id: toUserId,
      asset_id: assetId ?? null,
      message,
    })

    if (error) {
      setError(error.message)
      setState('error')
      return
    }
    setMessage('')
    setState('sent')
  }

  if (disabled) {
    return (
      <section className="rounded-xl border border-warn bg-warn-bg p-5 text-sm text-warn">
        Your account is suspended, so you cannot contact other participants.
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-surface p-5">
      <h2 className="mb-1 text-sm font-medium">Contact {toName}</h2>
      <p className="mb-3 text-xs text-faint">
        The message is stored on the platform; both sides and a platform manager can see it.
      </p>

      {state === 'sent' ? (
        <div className="flex items-center gap-3">
          <p className="rounded-lg border border-ok bg-ok-bg px-3 py-2 text-sm text-ok">
            Message sent.
          </p>
          <button
            onClick={() => setState('idle')}
            className="text-xs text-faint transition hover:text-fg"
          >
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="grid gap-3">
          <textarea
            required
            minLength={10}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and say what you would like to discuss."
            className="rounded-lg border bg-field px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              disabled={state === 'sending'}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
            >
              {state === 'sending' ? 'Sending…' : 'Send message'}
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </form>
      )}
    </section>
  )
}
