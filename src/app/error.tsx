'use client'

// Without this a throw anywhere in a server component — a dropped connection, a stale link to
// a row that has since been removed, an RLS edge nobody predicted — falls through to Next's
// unstyled crash screen. reset() re-runs the failed render, which is the right first move for
// a transient failure and costs the visitor nothing when it is not.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" className="flex flex-1 items-center px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          Something broke
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">This page did not load</h1>
        <p className="mt-4 leading-relaxed text-muted">
          The request failed on the way to the database. Trying again usually fixes it; if it
          does not, the catalogue is still there.
        </p>

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
            Try again
          </button>
          <a
            href="/assets"
            className="rounded-full border px-5 py-2 text-sm text-muted transition hover:text-fg"
          >
            Back to the catalogue
          </a>
        </div>
      </div>
    </main>
  )
}
