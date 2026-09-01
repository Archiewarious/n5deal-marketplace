import Link from 'next/link'
import { RegisterForm } from '@/components/RegisterForm'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getT } from '@/lib/locale'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('meta.register') }
}

// Registration, added beside the demo accounts rather than in place of them.
//
// The demo accounts stay the front door, and this page says so in its own lede: a fresh account
// owns no listings, has no mandate and has nobody to message, so someone here to review the
// product learns more in one click on the previous screen. What this page proves is that the
// path exists and that the role a new account gets is decided by the database rather than by the
// form (supabase/06_signup.sql).
export default async function RegisterPage() {
  const t = await getT()

  return (
    <main
      id="content"
      className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-12 sm:px-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--wash)' }}
      />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <header className="rise mb-7 text-center">
          <Link
            href="/login"
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur transition hover:text-fg"
          >
            ← {t('register.backToRoles')}
          </Link>
          <h1 className="display text-3xl font-semibold sm:text-4xl">{t('register.title')}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {t('register.lead')}
          </p>
        </header>

        <div className="rise" style={{ animationDelay: '90ms' }}>
          <RegisterForm />
        </div>
      </div>
    </main>
  )
}
