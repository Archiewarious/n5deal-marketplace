import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

// Navigation is built from the role, so a buyer never sees a link they would be bounced
// from. The links are a convenience, not the access control — that lives in RLS.
const LINKS: Record<Profile['role'], { href: string; label: string }[]> = {
  BUYER: [
    { href: '/assets', label: 'Assets' },
    { href: '/buyer/profile', label: 'My mandate' },
    { href: '/messages', label: 'Messages' },
  ],
  SELLER: [
    { href: '/assets', label: 'Assets' },
    { href: '/seller/assets', label: 'My listings' },
    { href: '/buyers', label: 'Buyers' },
    { href: '/messages', label: 'Messages' },
  ],
  MANAGER: [
    { href: '/assets', label: 'Assets' },
    { href: '/buyers', label: 'Buyers' },
    { href: '/admin', label: 'Administration' },
    { href: '/messages', label: 'Messages' },
  ],
}

export function TopNav({ profile }: { profile: Profile }) {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/assets" className="text-sm font-semibold tracking-tight">
          <span className="text-accent-text">N5</span>Deal
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {LINKS[profile.role].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-muted transition hover:bg-elevated hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs leading-tight">{profile.full_name}</p>
            <p className="text-[11px] leading-tight text-faint">
              {profile.company ?? profile.role}
              {profile.status === 'SUSPENDED' && (
                <span className="ml-1 text-danger">suspended</span>
              )}
            </p>
          </div>
          <SignOut />
        </div>
      </div>
    </header>
  )
}

function SignOut() {
  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }

  return (
    <form action={signOut}>
      <button className="rounded-full border px-3 py-1.5 text-xs text-muted transition hover:text-fg">
        Sign out
      </button>
    </form>
  )
}
