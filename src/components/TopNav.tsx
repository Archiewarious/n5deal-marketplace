import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ThemeToggle'
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

// The role is carried as a colour, the way the reference site colour-codes Seller, Buyer and
// Partner in its own navigation: a manager and a buyer should never mistake one screen for the
// other, and a chip does that faster than reading a word.
const ROLE_CHIP: Record<Profile['role'], { label: string; short: string; className: string }> = {
  SELLER: { label: 'Seller', short: 'Seller', className: 'bg-seller-bg text-seller' },
  BUYER: { label: 'Buyer', short: 'Buyer', className: 'bg-buyer-bg text-buyer' },
  MANAGER: { label: 'Platform manager', short: 'Manager', className: 'bg-manager-bg text-manager' },
}

export function TopNav({ profile }: { profile: Profile }) {
  const chip = ROLE_CHIP[profile.role]
  return (
    <header className="sticky top-0 z-20 border-b bg-surface/85 backdrop-blur">
      {/* Wraps rather than collapses into a hamburger. Four links do not need a menu behind a
          tap, and a nav you can read is worth more than one that is tidy. Below sm the links
          drop to their own row and scroll sideways; the identity block keeps only the role
          chip and the way out. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6">
        <Link href="/assets" className="shrink-0 text-sm font-semibold tracking-tight">
          <span className="text-accent-text">N5</span>Deal
        </Link>

        <nav className="order-last -mx-4 flex w-full gap-1 overflow-x-auto px-4 pb-0.5 text-sm sm:order-none sm:mx-0 sm:w-auto sm:overflow-x-visible sm:px-0 sm:pb-0">
          {LINKS[profile.role].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-muted transition hover:bg-elevated hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${chip.className}`}
            title={`Signed in as ${chip.label}`}
          >
            <span className="sm:hidden">{chip.short}</span>
            <span className="hidden sm:inline">{chip.label}</span>
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-xs leading-tight">{profile.full_name}</p>
            <p className="text-[11px] leading-tight text-faint">
              {profile.company ?? profile.role}
              {profile.status === 'SUSPENDED' && (
                <span className="ml-1 text-danger">suspended</span>
              )}
            </p>
          </div>
          <ThemeToggle />
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
