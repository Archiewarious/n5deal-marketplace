import Link from 'next/link'
import { getT } from '@/lib/locale'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('meta.notFound') }
}

// Next's default 404 is unstyled white-on-black and looks like the site fell over. It is also
// the page a reviewer lands on when they open a listing that RLS has decided they may not read,
// so it has to say something true without saying which of the two happened.
export default async function NotFound() {
  const t = await getT()
  return (
    <main id="content" className="flex flex-1 items-center px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          {t('notFound.eyebrow')}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-4 leading-relaxed text-muted">{t('notFound.body')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/assets"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            {t('notFound.back')}
          </Link>
          <Link
            href="/login"
            className="rounded-full border px-5 py-2 text-sm text-muted transition hover:text-fg"
          >
            {t('notFound.switch')}
          </Link>
        </div>
      </div>
    </main>
  )
}
