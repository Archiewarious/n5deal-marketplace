import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SiteFooter } from '@/components/SiteFooter'
import { LocaleProvider } from '@/components/LocaleProvider'
import { getLocale, getT } from '@/lib/locale'

// One superfamily, for two reasons.
//
// The first was a bug: only the 'latin' subset was loaded, so every Ukrainian and Russian
// character fell out of the webfont and into the system fallback. A Cyrillic heading rendered in
// Segoe UI beside Latin words in Inter, on the same line — two typefaces in one sentence, which
// is what "the fonts look crooked" actually was.
//
// The second is the fix being better than the bug deserved. The interface already sets every
// number, asset id and jurisdiction code in IBM Plex Mono, and Inter beside it is two unrelated
// families sharing a page: different proportions, different weight axis, different Cyrillic. IBM
// Plex Sans is drawn with that mono as one family, so a label and the figure beside it finally
// belong to each other. It is also the right register for the subject — Plex reads institutional
// rather than startup, which a marketplace in banking licences should.
const sans = IBM_Plex_Sans({
  variable: '--font-sans-face',
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700'],
})

// A licence is a document: a number, a regulator, a two-letter country. The mono is for those —
// asset ids, jurisdiction codes, money, counts. It is the register this business is written in,
// and it keeps digits on a grid so a column of prices can be compared by eye.
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
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
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
