import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getT } from '@/lib/locale'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import type { Profile } from '@/lib/types'

// Navigation is built from the role, so a buyer never sees a link they would be bounced
// from. The links are a convenience, not the access control — that lives in RLS.
const LINKS: Record<Profile['role'], { href: string; key: string }[]> = {
  BUYER: [
    { href: '/assets', key: 'nav.assets' },
    { href: '/buyer/profile', key: 'nav.myMandate' },
    { href: '/messages', key: 'nav.messages' },
  ],
  SELLER: [
    { href: '/assets', key: 'nav.assets' },
    { href: '/seller/assets', key: 'nav.myListings' },
    { href: '/buyers', key: 'nav.buyers' },
    { href: '/messages', key: 'nav.messages' },
  ],
  MANAGER: [
    { href: '/assets', key: 'nav.assets' },
    { href: '/buyers', key: 'nav.buyers' },
    { href: '/admin', key: 'nav.admin' },
    { href: '/messages', key: 'nav.messages' },
  ],
}

// The role is carried as a colour, the way the reference site colour-codes Seller, Buyer and
// Partner in its own navigation: a manager and a buyer should never mistake one screen for the
// other, and a chip does that faster than reading a word.
const ROLE_CHIP: Record<Profile['role'], { key: string; shortKey: string; className: string }> = {
  SELLER: { key: 'role.seller', shortKey: 'role.seller', className: 'bg-seller-bg text-seller' },
  BUYER: { key: 'role.buyer', shortKey: 'role.buyer', className: 'bg-buyer-bg text-buyer' },
  MANAGER: {
    key: 'role.manager',
    shortKey: 'role.managerShort',
    className: 'bg-manager-bg text-manager',
  },
}

export async function TopNav({ profile }: { profile: Profile }) {
  const t = await getT()
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
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${chip.className}`}
            title={t(chip.key)}
          >
            <span className="sm:hidden">{t(chip.shortKey)}</span>
            <span className="hidden sm:inline">{t(chip.key)}</span>
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-xs leading-tight">{profile.full_name}</p>
            <p className="text-[11px] leading-tight text-faint">
              {profile.company ?? profile.role}
              {profile.status === 'SUSPENDED' && (
                <span className="ml-1 text-danger">{t('nav.suspended')}</span>
              )}
            </p>
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <SignOut t={t} />
        </div>
      </div>
    </header>
  )
}

function SignOut({ t }: { t: Awaited<ReturnType<typeof getT>> }) {
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
        {t('nav.signOut')}
      </button>
    </form>
  )
}
