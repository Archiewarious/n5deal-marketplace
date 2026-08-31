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

  /**
   * Previous and Next keep being anchors on the boundary pages instead of turning into spans.
   *
   * Two reasons, both found by review. Swapping the element type destroys the DOM node, so
   * pressing Enter on Next at the last page moved focus to <body> and restarted the tab order
   * from the top of the document. And a bare <span> carries no disabled semantics at all, which
   * means the WCAG exemption for inactive controls does not apply to it and its text is held to
   * the full 4.5:1 — which `opacity-50` over --faint failed at 1.97:1, because --faint is
   * already documented as sitting on the 4.8:1 floor.
   *
   * So: same element, aria-disabled, out of the tab order, and dimmed by colour rather than by
   * opacity so the contrast stays measurable.
   */
  function Step({ to, label, rel }: { to: number; label: string; rel: 'prev' | 'next' }) {
    const off = to < 1 || to > pages
    if (off) {
      return (
        <span aria-disabled="true" className={`${box} border-line/60 text-faint`}>
          {label}
        </span>
      )
    }
    return (
      <Link href={hrefFor(to)} rel={rel} className={`${box} text-muted hover:text-fg`}>
        {label}
      </Link>
    )
  }

  return (
    <nav aria-label={t('page.label')} className="mt-8 flex flex-wrap items-center gap-2">
      <Step to={page - 1} label={t('page.previous')} rel="prev" />

      {slots.map((s, i) =>
        s === 'gap' ? (
          // Decoration. Without this a screen reader reads an ellipsis in the middle of a list
          // of links.
          <span key={`gap-${i}`} aria-hidden className="px-1 font-mono text-sm text-faint">
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
          // The visible label is a bare digit, which in a list of links reads as nothing at all.
          <Link
            key={s}
            href={hrefFor(s)}
            aria-label={t('page.goTo', { n: s })}
            className={`${box} text-muted hover:text-fg`}
          >
            {s}
          </Link>
        ),
      )}

      <Step to={page + 1} label={t('page.next')} rel="next" />
    </nav>
  )
}
