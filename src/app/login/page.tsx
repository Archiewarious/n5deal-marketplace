'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// This is the front door, not a login form.
//
// A marketplace has three sides and they want different things, so the first screen asks
// which side you are on rather than who you are — the same move N5Deal makes by colour-coding
// Seller, Buyer and Partner in its own navigation before a visitor has read a word. Each card
// says what that role can actually do here, so the choice is informative instead of a guess,
// and the credentials happen behind it.
//
// Real Supabase Auth still runs underneath: RLS needs a genuine auth.uid(), and a fake
// "current user" in a cookie would have left the database wide open. The password simply is
// not the visitor's problem on a demo.
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
    title: 'Seller',
    company: 'Nordic License Partners',
    person: 'Ingrid Halvorsen',
    blurb: 'You hold licensed entities and want them in front of the right buyers.',
    can: ['Publish an asset', 'Browse buyer mandates', 'Contact a buyer directly'],
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
    title: 'Buyer',
    company: 'Harbour Capital',
    person: 'Elena Vasquez',
    blurb: 'You are acquiring, and would rather not read every listing to find the three that fit.',
    can: ['State your mandate', 'See listings ranked by fit', 'Contact a seller directly'],
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
    title: 'Platform Manager',
    company: 'N5Deal',
    person: 'Anna Reid',
    blurb: 'You keep the marketplace clean and answer for what is listed on it.',
    can: ['See every participant and listing', 'Filter and search both', 'Suspend or remove'],
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

export default function LoginPage() {
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
    <main className="relative flex-1 overflow-hidden px-6 py-14">
      {/* Two soft pools of the brand hue behind the content — the job the gradient wash does on
          the reference site, which a flat background cannot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 500px at 12% -10%, rgba(56,59,254,.20), transparent 60%),' +
            'radial-gradient(700px 450px at 92% 6%, rgba(52,211,153,.10), transparent 58%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl">
        <header className="rise mb-10 text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur">
            <span className="size-1.5 rounded-full bg-seller" />
            16 licensed assets listed · 6 participants
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            The marketplace for <span className="text-accent-text">licensed</span> financial
            assets
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Banking, EMI, payment and crypto entities with the paperwork already checked.
            Pick the side you are on.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => {
            const tone = TONE[r.tone]
            return (
              <button
                key={r.email}
                onClick={() => signIn(r.email, DEMO_PASSWORD)}
                disabled={busy !== null}
                aria-label={`Enter as ${r.title} — ${r.company}`}
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

                <p className={`text-xs uppercase tracking-[0.16em] ${tone.text}`}>{r.title}</p>
                <p className="mt-1 text-lg font-medium">{r.company}</p>
                <p className="text-sm text-faint">{r.person}</p>

                <p className="mt-4 text-sm leading-relaxed text-muted">{r.blurb}</p>

                <ul className="mt-5 space-y-2 border-t pt-4">
                  {r.can.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-sm text-muted">
                      <span className={`mt-[7px] size-1 shrink-0 rounded-full bg-current ${tone.text}`} />
                      {c}
                    </li>
                  ))}
                </ul>

                <span className={`mt-5 flex items-center gap-1.5 text-sm ${tone.text}`}>
                  {busy === r.email ? 'Entering…' : `Enter as ${r.title}`}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="rise mt-4 grid gap-4 sm:grid-cols-[1fr_auto]"
          style={{ animationDelay: '360ms' }}
        >
          <button
            onClick={() => signIn('buyer.solace@n5demo.com', DEMO_PASSWORD)}
            disabled={busy !== null}
            aria-label="Enter as a suspended buyer, Solace Holdings"
            className="rounded-2xl border border-dashed bg-surface/50 px-5 py-4 text-left text-sm transition hover:border-danger disabled:opacity-50"
          >
            <span className="text-danger">Suspended account</span>
            <span className="text-muted">
              {' '}
              — Solace Holdings. Enter to see what a blocked participant sees, which is nothing:
              the rows never leave the database.
            </span>
          </button>

          <details className="rounded-2xl border bg-surface/50 px-5 py-4">
            <summary className="cursor-pointer text-sm text-muted">Use an email instead</summary>
            <form
              className="mt-4 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                signIn(email, password)
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-lg border bg-field px-3 py-2 text-sm"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-lg border bg-field px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
              >
                Sign in
              </button>
            </form>
          </details>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Every demo account uses the password <code className="text-muted">demo1234</code>.
        </p>

        {error && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-md rounded-lg border border-danger bg-danger-bg px-3 py-2 text-center text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
