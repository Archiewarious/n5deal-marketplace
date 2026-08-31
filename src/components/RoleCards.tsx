'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/components/LocaleProvider'

// The three sides of the marketplace, as the way in.
//
// A marketplace has three sides and they want different things, so the first thing a visitor is
// asked is which side they are on, not who they are. Each card says what that role can actually
// do here, so the choice is informative instead of a guess. The block appears twice: as the
// whole of /login, and as the closing act of the landing page.
//
// Real Supabase Auth still runs underneath. RLS needs a genuine auth.uid(), and a fake "current
// user" in a cookie would have left the database wide open. The password is simply not the
// visitor's problem on a demo.
const DEMO_PASSWORD = 'demo1234'

type Tone = 'seller' | 'buyer' | 'manager'

type Role = {
  email: string
  title: string
  company: string
  person: string
  blurb: string
  can: string[]
  tone: Tone
  icon: React.ReactNode
}

const ROLES: Role[] = [
  {
    email: 'seller.nordic@n5demo.com',
    title: 'role.seller',
    company: 'Nordic License Partners',
    person: 'Ingrid Halvorsen',
    blurb: 'login.sellerBlurb',
    can: ['login.sellerCan1', 'login.sellerCan2', 'login.sellerCan3'],
    tone: 'seller',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </svg>
    ),
  },
  {
    email: 'buyer.harbour@n5demo.com',
    title: 'role.buyer',
    company: 'Harbour Capital',
    person: 'Elena Vasquez',
    blurb: 'login.buyerBlurb',
    can: ['login.buyerCan1', 'login.buyerCan2', 'login.buyerCan3'],
    tone: 'buyer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M3 5h2l2.6 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="18" cy="20" r="1.2" />
      </svg>
    ),
  },
  {
    email: 'manager@n5demo.com',
    title: 'role.manager',
    company: 'N5Deal',
    person: 'Anna Reid',
    blurb: 'login.managerBlurb',
    can: ['login.managerCan1', 'login.managerCan2', 'login.managerCan3'],
    tone: 'manager',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3l7.5 3v5.2c0 4.4-3 8.4-7.5 9.8-4.5-1.4-7.5-5.4-7.5-9.8V6z" />
        <path d="M9.2 12.2l2 2 3.6-3.9" />
      </svg>
    ),
  },
]

const TONE: Record<Tone, { text: string; bg: string; border: string; bar: string }> = {
  seller: {
    text: 'text-seller',
    bg: 'bg-seller-bg',
    border: 'hover:border-seller',
    bar: 'group-hover:bg-seller',
  },
  buyer: {
    text: 'text-buyer',
    bg: 'bg-buyer-bg',
    border: 'hover:border-buyer',
    bar: 'group-hover:bg-buyer',
  },
  manager: {
    text: 'text-manager',
    bg: 'bg-manager-bg',
    border: 'hover:border-manager',
    bar: 'group-hover:bg-manager',
  },
}

/**
 * @param showExtras the suspended-account card and the email form. On the landing page the
 * three roles are the call to action and the edge cases would dilute it; on /login, where a
 * reviewer has come specifically to try the access rules, they are the point.
 */
export function RoleCards({ showExtras = true }: { showExtras?: boolean }) {
  const t = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(withEmail: string, withPassword: string) {
    setBusy(withEmail)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: withEmail,
      password: withPassword,
    })
    if (error) {
      setError(error.message)
      setBusy(null)
      return
    }
    router.push('/assets')
    router.refresh()
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r, i) => {
          const tone = TONE[r.tone]
          return (
            <button
              key={r.email}
              onClick={() => signIn(r.email, DEMO_PASSWORD)}
              disabled={busy !== null}
              aria-label={`${t('login.enterAs', { role: t(r.title) })}, ${r.company}`}
              style={{ animationDelay: `${80 + i * 90}ms` }}
              className={`group rise relative overflow-hidden rounded-2xl border bg-surface p-6 text-left transition duration-200 hover:-translate-y-1 disabled:opacity-50 ${tone.border}`}
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-0.5 bg-line transition-colors ${tone.bar}`}
              />

              <span className={`mb-5 grid size-11 place-items-center rounded-xl ${tone.bg}`}>
                <span className={`size-5 ${tone.text}`}>{r.icon}</span>
              </span>

              <p className={`font-mono text-xs uppercase tracking-[0.16em] ${tone.text}`}>
                {t(r.title)}
              </p>
              <p className="mt-1 text-lg font-medium">{r.company}</p>
              <p className="text-sm text-faint">{r.person}</p>

              <p className="mt-4 text-sm leading-relaxed text-muted">{t(r.blurb)}</p>

              <ul className="mt-5 space-y-2 border-t pt-4">
                {r.can.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-muted">
                    <span
                      className={`mt-[7px] size-1 shrink-0 rounded-full bg-current ${tone.text}`}
                    />
                    {t(c)}
                  </li>
                ))}
              </ul>

              <span className={`mt-5 flex items-center gap-1.5 text-sm ${tone.text}`}>
                {busy === r.email ? t('login.entering') : t('login.enterAs', { role: t(r.title) })}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {showExtras && (
        <div
          className="rise mt-4 grid gap-4 sm:grid-cols-[1fr_auto]"
          style={{ animationDelay: '360ms' }}
        >
          <button
            onClick={() => signIn('buyer.solace@n5demo.com', DEMO_PASSWORD)}
            disabled={busy !== null}
            aria-label={t('login.enterSuspended')}
            className="rounded-2xl border border-dashed bg-surface/50 px-5 py-4 text-left text-sm transition hover:border-danger disabled:opacity-50"
          >
            <span className="text-danger">{t('login.suspendedTitle')}</span>
            <span className="text-muted">
              {' '}
              — {t('login.suspendedBody')}
            </span>
          </button>

          <details className="rounded-2xl border bg-surface/50 px-5 py-4">
            <summary className="cursor-pointer text-sm text-muted">{t('login.useEmail')}</summary>
            <form
              className="mt-4 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                signIn(email, password)
              }}
            >
              <label className="sr-only" htmlFor="demo-email">
                {t('login.email')}
              </label>
              <input
                id="demo-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email')}
                className="rounded-lg border bg-field px-3 py-2 text-sm"
              />
              <label className="sr-only" htmlFor="demo-password">
                {t('login.password')}
              </label>
              <input
                id="demo-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                className="rounded-lg border bg-field px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
              >
                {t('login.signIn')}
              </button>
            </form>
          </details>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-faint">
        {t('login.everyAccount')}{' '}
        <code className="font-mono text-muted">demo1234</code>.
      </p>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-md rounded-lg border border-danger bg-danger-bg px-3 py-2 text-center text-sm text-danger"
        >
          {error}
        </p>
      )}
    </>
  )
}
