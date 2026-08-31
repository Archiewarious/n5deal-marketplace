'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/components/LocaleProvider'

// Contacting the other side is a single insert. The RLS policy checks that from_user_id
// is the caller and that the caller is active, so a suspended account cannot send
// messages even if this form were bypassed entirely.
export function ContactForm({
  toUserId,
  toName,
  assetId,
  disabled = false,
  compact = false,
}: {
  toUserId: string
  toName: string
  assetId?: string
  disabled?: boolean
  /** Inside a thread the heading and the framing are already on the page. */
  compact?: boolean
}) {
  const t = useT()
  const router = useRouter()
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
      setError(t('session.expired'))
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
    // The thread this reply belongs to is rendered by a server component, so without this the
    // message is stored and the conversation above it still ends where it did before.
    router.refresh()
  }

  if (disabled) {
    return (
      <section className="rounded-xl border border-warn bg-warn-bg p-5 text-sm text-warn">
        {t('contact.suspended')}
      </section>
    )
  }

  return (
    <section className={compact ? '' : 'rounded-xl border bg-surface p-5'}>
      {!compact && (
        <>
          <h2 className="mb-1 text-sm font-medium">{t('contact.heading', { name: toName })}</h2>
          <p className="mb-3 text-xs text-faint">{t('contact.note')}</p>
        </>
      )}

      {state === 'sent' ? (
        <div className="flex items-center gap-3">
          {/* role="status" because the form disappears when it succeeds: without it a screen
              reader is told nothing happened at all. */}
          <p
            role="status"
            className="rounded-lg border border-ok bg-ok-bg px-3 py-2 text-sm text-ok"
          >
            {t('contact.sent')}
          </p>
          <button
            onClick={() => setState('idle')}
            className="text-xs text-faint transition hover:text-fg"
          >
            {t('contact.another')}
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="sr-only">{t('contact.label', { name: toName })}</span>
            <textarea
              required
              minLength={10}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(compact ? 'contact.replyPlaceholder' : 'contact.placeholder')}
              className="rounded-lg border bg-field px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              disabled={state === 'sending'}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
            >
              {t(
                state === 'sending'
                  ? 'contact.sending'
                  : compact
                    ? 'contact.sendReply'
                    : 'contact.send',
              )}
            </button>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
