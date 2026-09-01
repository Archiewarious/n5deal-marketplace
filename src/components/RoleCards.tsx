'use client'

import { useRef, useState } from 'react'
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* A certificate with a seal. What a seller actually holds is a licence. */}
        <path d="M19 12.5V4.5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h5" />
        <path d="M8.5 8h7M8.5 11.5h5" />
        <circle cx="17" cy="16.5" r="3" />
        <path d="M15.4 19l-.4 2.5 2-1 2 1-.4-2.5" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* A mandate is a brief you hunt against, so: a target, not a basket. */}
        <circle cx="11.5" cy="12.5" r="7.5" />
        <circle cx="11.5" cy="12.5" r="3.5" />
        <path d="M11.5 12.5 20 4M16.5 4h3.5v3.5" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3.2l7.2 2.6v5.3c0 4.3-2.9 8.2-7.2 9.7-4.3-1.5-7.2-5.4-7.2-9.7V5.8z" />
        <path d="M9.2 12.1l2.1 2.1 3.6-3.9" />
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // `busy` disables the buttons, but a state update does not land until React re-renders, so two
  // clicks inside the same tick both get through it. A ref changes on the spot.
  const running = useRef(false)

  /**
   * Sign in and leave through a full page load.
   *
   * This used to be signInWithPassword + router.push + router.refresh, and it failed in the way
   * that is worst to debug: silently, and only sometimes. Clicking a second role before the first
   * finished ran two token exchanges at once; the second one's push cancelled the first one's
   * in-flight RSC request, nothing navigated, and nothing was shown. The session cookie was
   * already written by then, so the visitor sat on the role picker, signed in, being told nothing
   * — reloading the page would have dropped them straight into the app. Reproduced on the
   * deployed build: two clicks, ten seconds, still on /login with a valid auth cookie.
   *
   * Three changes, each closing one door:
   *
   *   The ref above makes a second concurrent sign-in impossible rather than merely unlikely.
   *
   *   signOut({ scope: 'local' }) first, so switching roles always starts from an empty session
   *   instead of relying on the new cookie overwriting the old one cleanly. The scope is not
   *   decoration: the library defaults to 'global', which revokes every session the account holds
   *   anywhere. On six shared demo accounts that turns switching role in one tab into signing
   *   everyone else out — and it does not look like being signed out, because the browser keeps a
   *   cryptographically valid, unexpired cookie whose session the server has deleted. Middleware
   *   verifies the JWT locally and waves it through; the page calls getUser(), Supabase answers
   *   session_not_found, and every protected route bounces to the role picker. Which is exactly
   *   the "I click a role and it does not log me in" this file was opened to fix.
   *
   *   location.assign instead of router.push, because a role switch changes who every server
   *   component on the next page is rendering for. The App Router would happily serve /assets
   *   from the client router cache — the copy it rendered for the previous role — and
   *   router.refresh() racing to invalidate it is exactly the kind of ordering that works on a
   *   fast connection and not on a slow one. A document load has no such race: the server reads
   *   the new cookie on the first request and there is nothing cached to serve.
   *
   * The cost is one full page load per role switch, on a screen whose entire purpose is switching
   * roles. That is the right trade.
   */
  async function signIn(withEmail: string, withPassword: string) {
    if (running.current) return
    running.current = true
    setBusy(withEmail)
    setError(null)

    const supabase = createClient()
    try {
      await supabase.auth.signOut({ scope: 'local' })
      const { error } = await supabase.auth.signInWithPassword({
        email: withEmail,
        password: withPassword,
      })
      if (error) throw error
      window.location.assign('/assets')
    } catch (e) {
      // Whatever went wrong, it is now on screen. The previous version could only report an
      // error from one specific call, and reported nothing at all when navigation was the thing
      // that failed.
      setError(e instanceof Error ? e.message : String(e))
      setBusy(null)
      running.current = false
    }
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
              // flex-col plus mt-auto on the last row: the three blurbs are two, two and three
              // lines long, so without this the divider, the bullet list and the call to action
              // each sat at a different height in each card and the row read as crooked.
              className={`group rise relative flex flex-col overflow-hidden rounded-2xl border bg-surface p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 disabled:opacity-50 ${tone.border}`}
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

              {/* Reserved height rather than natural height, so the rule under it is the same
                  line in all three cards. Three lines is the longest of the three blurbs. */}
              <p className="mt-4 min-h-[4.5rem] text-sm leading-relaxed text-muted">{t(r.blurb)}</p>

              <ul className="mt-1 space-y-2 border-t pt-4">
                {r.can.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-muted">
                    <span
                      className={`mt-[7px] size-1 shrink-0 rounded-full bg-current ${tone.text}`}
                    />
                    {t(c)}
                  </li>
                ))}
              </ul>

              <span className={`mt-auto flex items-center gap-1.5 pt-5 text-sm ${tone.text}`}>
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
          className="rise mt-4 grid items-stretch gap-4 sm:grid-cols-[1.6fr_1fr]"
          style={{ animationDelay: '360ms' }}
        >
          <button
            onClick={() => signIn('buyer.solace@n5demo.com', DEMO_PASSWORD)}
            disabled={busy !== null}
            aria-label={t('login.enterSuspended')}
            className="rounded-2xl border border-dashed bg-surface/50 px-5 py-4 text-left text-sm leading-relaxed transition hover:border-danger disabled:opacity-50"
          >
            <span className="text-danger">{t('login.suspendedTitle')}</span>
            <span className="text-muted">
              {' '}
              — {t('login.suspendedBody')}
            </span>
          </button>

          <details className="rounded-2xl border bg-surface/50 px-5 py-4 [&[open]]:bg-surface">
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
