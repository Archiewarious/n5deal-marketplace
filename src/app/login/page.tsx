import Link from 'next/link'
import { RoleCards } from '@/components/RoleCards'

export const metadata = { title: 'Choose a role' }

// The front door, not a login form. The cards themselves live in RoleCards, because the landing
// page ends with the same three and there is no reason for two copies of them to drift apart.
export default function LoginPage() {
  return (
    <main className="relative flex-1 overflow-hidden px-4 py-14 sm:px-6">
      {/* One quiet pool of the accent behind the cards. The palette is deliberately flat, so
          this is depth rather than a glow: enough to keep the three cards off a dead ground,
          not enough to be noticed as an effect. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 520px at 50% -12%, rgba(45,86,140,.28), transparent 62%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl">
        <header className="rise mb-10 text-center">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur transition hover:text-fg"
          >
            <span className="size-1.5 rounded-full bg-seller" />
            About the platform
          </Link>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            The marketplace for <span className="text-accent-text">licensed</span> financial
            assets
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Banking, EMI, payment and crypto entities with the paperwork already checked.
            Pick the side you are on.
          </p>
        </header>

        <RoleCards />
      </div>
    </main>
  )
}
