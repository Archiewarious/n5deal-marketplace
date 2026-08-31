'use client'

import { useT } from '@/components/LocaleProvider'

// Without this a throw anywhere in a server component — a dropped connection, a stale link to
// a row that has since been removed, an RLS edge nobody predicted — falls through to Next's
// unstyled crash screen. reset() re-runs the failed render, which is the right first move for
// a transient failure and costs the visitor nothing when it is not.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useT()
  return (
    <main id="content" className="flex flex-1 items-center px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          {t('error.eyebrow')}
        </p>
        <h1 className="mt-4 display text-3xl font-semibold">{t('error.title')}</h1>
        <p className="mt-4 leading-relaxed text-muted">{t('error.body')}</p>

        {error.message && (
          <p className="mt-5 rounded-lg border bg-field px-3 py-2 font-mono text-xs text-faint">
            {error.message}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            {t('error.retry')}
          </button>
          <a
            href="/assets"
            className="rounded-full border px-5 py-2 text-sm text-muted transition hover:text-fg"
          >
            {t('notFound.back')}
          </a>
        </div>
      </div>
    </main>
  )
}
