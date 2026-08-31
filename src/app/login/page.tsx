import Link from 'next/link'
import { RoleCards } from '@/components/RoleCards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getT } from '@/lib/locale'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('meta.login') }
}

// The front door, not a login form. The cards themselves live in RoleCards, because the landing
// page ends with the same three and there is no reason for two copies of them to drift apart.
export default async function LoginPage() {
  const t = await getT()
  return (
    <main id="content" className="relative flex-1 overflow-hidden px-4 py-14 sm:px-6">
      {/* One quiet pool of the accent behind the cards. The palette is deliberately flat, so
          this is depth rather than a glow: enough to keep the three cards off a dead ground,
          not enough to be noticed as an effect. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--wash)' }}
      />

      <div className="absolute right-4 top-4 z-10 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <header className="rise mb-10 text-center">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur transition hover:text-fg"
          >
            <span className="size-1.5 rounded-full bg-seller" />
            {t('login.about')}
          </Link>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {t('login.h1a')} <span className="text-accent-text">{t('login.h1accent')}</span>{' '}
            {t('login.h1b')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            {t('login.lede')}
          </p>
        </header>

        <RoleCards />
      </div>
    </main>
  )
}
