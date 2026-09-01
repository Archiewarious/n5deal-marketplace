'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/components/LocaleProvider'

/**
 * A real sign-up, next to the demo accounts rather than instead of them.
 *
 * Two things about it are worth knowing before reading the code.
 *
 * The role is sent as metadata and is not trusted. A database trigger builds the profile row and
 * clamps anything that is not SELLER to BUYER (supabase/06_signup.sql), so the worst a crafted
 * request achieves by asking for MANAGER is an ordinary buyer account. The select below is a
 * convenience for the person filling the form, never the thing that decides.
 *
 * And sign-up may or may not return a session, depending on a project setting this code cannot
 * see: with email confirmation on, Supabase returns a user and no session, and the account does
 * not work until a link is opened. Both outcomes are handled, because guessing wrong would mean
 * either dropping someone into a session they do not have, or telling someone to check an inbox
 * for a letter that was never sent.
 */
// Written out rather than assembled from the role name: Tailwind generates the stylesheet by
// reading these files as text, so `border-${tone}` is a class that exists in the DOM and never in
// the CSS.
const SIDES = [
  {
    value: 'BUYER' as const,
    title: 'register.asBuyer',
    blurb: 'register.asBuyerWhat',
    on: 'border-buyer bg-buyer-bg',
    text: 'text-buyer',
  },
  {
    value: 'SELLER' as const,
    title: 'register.asSeller',
    blurb: 'register.asSellerWhat',
    on: 'border-seller bg-seller-bg',
    text: 'text-seller',
  },
]

export function RegisterForm() {
  const t = useT()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  // Same reason as the role picker: `busy` is state, so it only disables the button on the next
  // render, and a double submit inside one tick creates two accounts.
  const running = useRef(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (running.current) return
    running.current = true
    setBusy(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), company: company.trim(), role } },
      })
      if (error) throw error

      // A session here means confirmation is off and the account is already usable. Leave with a
      // document load for the same reason the role picker does: the server has to read the new
      // cookie on the first request, and nothing cached may be served in its place.
      if (data.session) return window.location.assign('/assets')

      setSent(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      running.current = false
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-surface p-6 text-center">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-ok-bg text-ok">
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 6.5 8.5 6 8.5-6" />
          </svg>
        </span>
        <h2 className="heading text-lg font-medium">{t('register.checkTitle')}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {t('register.checkBody', { email: sent })}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-full border px-4 py-2 text-sm text-muted transition hover:text-fg"
        >
          {t('register.backToRoles')}
        </Link>
      </div>
    )
  }

  const field = 'w-full rounded-lg border bg-field px-3 py-2 text-sm'
  const label = 'text-[11px] uppercase tracking-[0.14em] text-faint'

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className={label} htmlFor="reg-name">
            {t('register.name')}
          </label>
          <input
            id="reg-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            autoComplete="name"
          />
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor="reg-company">
            {t('register.company')}{' '}
            <span className="normal-case tracking-normal">({t('register.companyOptional')})</span>
          </label>
          <input
            id="reg-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={field}
            autoComplete="organization"
          />
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor="reg-email">
            {t('register.email')}
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            autoComplete="email"
          />
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor="reg-password">
            {t('register.password')}
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            autoComplete="new-password"
            aria-describedby="reg-password-hint"
          />
          <p id="reg-password-hint" className="text-xs text-faint">
            {t('register.passwordHint')}
          </p>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className={`${label} mb-2`}>{t('register.sideQuestion')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIDES.map(({ value, title, blurb, on: onClass, text }) => {
            const on = role === value
            return (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  on ? onClass : 'hover:border-fg/20'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={on}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                <span className={`block text-sm font-medium ${on ? text : ''}`}>
                  {t(title)}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{t(blurb)}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-faint">{t('register.sideNote')}</p>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t('register.haveAccount')}{' '}
          <Link href="/login" className="text-accent-text hover:underline">
            {t('register.signIn')}
          </Link>
        </p>
        <button
          disabled={busy}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? t('register.working') : t('register.submit')}
        </button>
      </div>
    </form>
  )
}
