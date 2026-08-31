import Link from 'next/link'

export const metadata = { title: 'Not found' }

// Next's default 404 is unstyled white-on-black and looks like the site fell over. It is also
// the page a reviewer lands on when they open a listing that RLS has decided they may not read,
// so it has to say something true without saying which of the two happened.
export default function NotFound() {
  return (
    <main id="content" className="flex flex-1 items-center px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Error 404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Nothing at this address</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Either the page does not exist, or it holds a row this account may not read. Row level
          security answers both the same way on purpose: a listing you have no right to see should
          not confirm that it exists.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/assets"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            Back to the catalogue
          </Link>
          <Link
            href="/login"
            className="rounded-full border px-5 py-2 text-sm text-muted transition hover:text-fg"
          >
            Switch role
          </Link>
        </div>
      </div>
    </main>
  )
}
