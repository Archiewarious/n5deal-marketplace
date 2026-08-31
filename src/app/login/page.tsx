'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Real Supabase Auth (email + password), with the demo accounts offered as buttons so a
// reviewer never has to type credentials. Skipping auth entirely would have been quicker,
// but the whole access model of this prototype is enforced by RLS, and RLS needs a real
// auth.uid() — a fake "current user" in a cookie would have left the database open.
const DEMO = [
  { email: 'seller.nordic@n5demo.com', label: 'Seller', hint: 'Nordic License Partners' },
  { email: 'buyer.harbour@n5demo.com', label: 'Buyer', hint: 'Harbour Capital' },
  { email: 'manager@n5demo.com', label: 'Platform Manager', hint: 'N5Deal' },
  { email: 'buyer.solace@n5demo.com', label: 'Suspended buyer', hint: 'Solace Holdings' },
]
const DEMO_PASSWORD = 'demo1234'

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
    <main className="flex-1 grid place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-accent text-xs tracking-[0.2em] uppercase mb-3">N5Deal</p>
        <h1 className="text-2xl font-semibold mb-2">Marketplace prototype</h1>
        <p className="text-muted text-sm mb-8">
          M&amp;A opportunities and licensed financial assets.
        </p>

        <div className="rounded-xl border bg-surface p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-faint mb-3">Sign in as</p>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => signIn(d.email, DEMO_PASSWORD)}
                disabled={busy !== null}
                className="flex items-center justify-between rounded-lg border bg-elevated px-4 py-3 text-left transition hover:border-accent disabled:opacity-50"
              >
                <span>
                  <span className="block text-sm">{d.label}</span>
                  <span className="block text-xs text-faint">{d.hint}</span>
                </span>
                <span className="text-xs text-faint">
                  {busy === d.email ? 'signing in…' : '→'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-faint mt-3">
            All demo accounts use the password <code className="text-muted">demo1234</code>.
          </p>
        </div>

        <details className="rounded-xl border bg-surface p-5">
          <summary className="cursor-pointer text-sm text-muted">
            Sign in with an email instead
          </summary>
          <form
            className="grid gap-3 mt-4"
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        </details>

        {error && (
          <p className="mt-4 rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
