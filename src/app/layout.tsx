import type { Metadata } from 'next'
import { Inter, Inter_Tight, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SiteFooter } from '@/components/SiteFooter'
import { LocaleProvider } from '@/components/LocaleProvider'
import { getLocale, getT } from '@/lib/locale'

// Three cuts, two families, one register.
//
// This went through two wrong answers first, and both are worth keeping in the record.
//
// The original loaded only `subsets: ['latin']`, so Cyrillic was not in the webfont at all and
// every Ukrainian and Russian character fell through to the system fallback — two typefaces in
// one sentence, which is what "the fonts look crooked" was.
//
// The repair after that was IBM Plex Sans, chosen for superfamily cohesion with the mono. It
// fixed the fallback and introduced a different problem: Plex Sans is wide in Cyrillic, and at
// 48px with default tracking a Russian headline sprawls across the measure.
//
// The answer is a display cut and a tracking system, not just a family. Inter Tight is Inter
// drawn narrower for headings; Inter carries the body; the mono keeps the figures. The tracking
// scale that goes with it lives in globals.css, and it is the half that actually stops the
// sprawl — a display line wants negative tracking, a 10px uppercase label wants positive.
const display = Inter_Tight({
  variable: '--font-display-face',
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['500', '600', '700'],
})

const sans = Inter({
  variable: '--font-sans-face',
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
})

const mono = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
})

// A function rather than a constant, because the default title and the description are the two
// strings a link preview shows and they were the only ones left in English in every locale.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
  // A template so every route names itself in the tab and in a shared link, instead of nine
  // pages all reading "N5Deal Marketplace".
    title: { default: t('meta.default'), template: '%s · N5Deal' },
    description: t('meta.description'),
    openGraph: {
      title: t('meta.default'),
      description: t('meta.description'),
      type: 'website',
    },
    // opengraph-image.tsx fills in the image for both cards; this only says which shape to use.
    twitter: { card: 'summary_large_image' },
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale()
  const t = await getT()
  return (
    <html lang={locale} className={`${sans.variable} ${display.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint, which is the whole point: read once from the browser and
            stamp the root element, so a visitor who chose dark never sees the light page flash
            past first. Inline and tiny because anything loaded as a file arrives too late. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Every page puts two to four nav links, a role chip, a name and a sign-out button
            ahead of the content. Without this, reaching the listings by keyboard means tabbing
            past all of it on all nine routes. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-accent-fg"
        >
          {t('skip.toContent')}
        </a>
        <LocaleProvider locale={locale}>
          {children}
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  )
}
