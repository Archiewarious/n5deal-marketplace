import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SiteFooter } from '@/components/SiteFooter'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

// A licence is a document: a number, a regulator, a two-letter country. The mono is for those —
// asset ids, jurisdiction codes, money, counts. It is the register this business is written in,
// and it keeps digits on a grid so a column of prices can be compared by eye.
const mono = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  // A template so every route names itself in the tab and in a shared link, instead of nine
  // pages all reading "N5Deal Marketplace".
  title: {
    default: 'N5Deal — marketplace for licensed financial assets',
    template: '%s · N5Deal',
  },
  description:
    'Banking, EMI, payment and crypto entities for sale, matched to buyer mandates. A working prototype built on Next.js and Supabase, with every role boundary enforced in the database.',
  openGraph: {
    title: 'N5Deal — marketplace for licensed financial assets',
    description:
      'Banking, EMI, payment and crypto entities for sale, matched to buyer mandates.',
    type: 'website',
  },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
