import Link from 'next/link'
import type { T } from '@/lib/i18n'

/**
 * Pages the catalogue, because a full specification per card does not scale down a list.
 *
 * The card is deliberately the size it is — it is the reference site's card, ten label/value
 * rows, two panels and a chart — and thirty of them stacked is roughly thirty thousand pixels
 * of scrolling. The reference site has 137 listings and pages them for exactly this reason. The
 * fix is not a smaller card; it is fewer cards at a time.
 *
 * Links rather than buttons, and the page number lives in the URL beside the filters, so the
 * third page of a filtered search is a thing you can send someone. That also keeps this a server
 * component with no state to get out of sync.
 */
export function Pagination({
  page,
  pages,
  hrefFor,
  t,
}: {
  page: number
  pages: number
  /** Build the URL for a page, preserving whatever filters are already set. */
  hrefFor: (page: number) => string
  t: T
}) {
  if (pages <= 1) return null

  // At most seven slots: first, last, the current one and its neighbours, with gaps marked.
  // A row of thirty page numbers is its own scrolling problem.
  const slots: (number | 'gap')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) slots.push(i)
    else if (slots[slots.length - 1] !== 'gap') slots.push('gap')
  }

  const box =
    'grid h-9 min-w-9 place-items-center rounded-lg border px-3 font-mono text-sm transition'

  return (
    <nav aria-label={t('page.label')} className="mt-8 flex flex-wrap items-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${box} text-muted hover:text-fg`}>
          {t('page.previous')}
        </Link>
      ) : (
        <span className={`${box} text-faint opacity-50`}>{t('page.previous')}</span>
      )}

      {slots.map((s, i) =>
        s === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 font-mono text-sm text-faint">
            …
          </span>
        ) : s === page ? (
          <span
            key={s}
            aria-current="page"
            className={`${box} border-accent-text bg-accent-text/10 text-accent-text`}
          >
            {s}
          </span>
        ) : (
          <Link key={s} href={hrefFor(s)} className={`${box} text-muted hover:text-fg`}>
            {s}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${box} text-muted hover:text-fg`}>
          {t('page.next')}
        </Link>
      ) : (
        <span className={`${box} text-faint opacity-50`}>{t('page.next')}</span>
      )}
    </nav>
  )
}
