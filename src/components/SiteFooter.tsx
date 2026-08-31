import Link from 'next/link'
import { getT } from '@/lib/locale'

/**
 * A page that ends where its last table ends reads as a screen, not as a product.
 *
 * The reference site closes with a full footer; this one closes with the two things a reviewer
 * of a prototype actually wants at the bottom of the page — where the code is, and what is
 * honestly not built yet. Everything here points somewhere real. Nothing links to a page that
 * does not exist, because a dead link in a footer is worse than no footer.
 */
export async function SiteFooter() {
  const t = await getT()
  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            <span className="text-accent-text">N5</span>Deal
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {t('footer.blurb')}
          </p>
        </div>

        <nav aria-label="Product">
          <p className="text-[10px] uppercase tracking-wider text-faint">{t('footer.marketplace')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/assets" className="text-muted transition hover:text-fg">
                {t('footer.allListings')}
              </Link>
            </li>
            <li>
              <Link href="/buyers" className="text-muted transition hover:text-fg">
                {t('footer.mandates')}
              </Link>
            </li>
            <li>
              <Link href="/messages" className="text-muted transition hover:text-fg">
                {t('nav.messages')}
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted transition hover:text-fg">
                {t('footer.switchRole')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Project">
          <p className="text-[10px] uppercase tracking-wider text-faint">{t('footer.build')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/Archiewarious/n5deal-marketplace"
                className="text-muted transition hover:text-fg"
              >
                {t('footer.source')}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Archiewarious/n5deal-marketplace/blob/master/README.md"
                className="text-muted transition hover:text-fg"
              >
                {t('footer.readme')}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Archiewarious/n5deal-marketplace/blob/master/supabase/SECURITY.md"
                className="text-muted transition hover:text-fg"
              >
                {t('footer.audit')}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-faint sm:px-6">
          {t('footer.colophon')}
        </p>
      </div>
    </footer>
  )
}
