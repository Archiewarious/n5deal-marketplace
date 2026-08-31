import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'
import { formatPriceShort } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { sectorTone } from '@/lib/sector'
import { AssetCard } from '@/components/AssetCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import type { Asset } from '@/lib/types'
import type { T } from '@/lib/i18n'

export const metadata = { title: 'Card designs' }

// A scratch page for choosing a card. Public on purpose: it reads no database and needs no
// session, so the link opens anywhere, including a phone. Deleted once a design is picked.
//
// The first round of this page offered four layouts of the same ledger and was told, correctly,
// that rearranging label/value rows is not a redesign. What was actually wrong:
//
//   1. Every fact sat at one weight, so nothing was findable and the eye had no entry point.
//   2. A bordered box per field is a spreadsheet idiom. It says "row of data", not "licence".
//   3. The one fact a buyer is actually shopping for — what the licence permits — was the
//      smallest, greyest thing on the card.
//   4. A 200px chart existed to deliver one sentence: dearer than 64% of comparable listings.
//   5. Nothing on it belonged to this subject. Change the words and it sells second-hand cars.
//
// So the two below are built from the object being sold. A licence is an instrument issued by a
// named authority, granting named permissions, in a named jurisdiction, on a date. That is the
// hierarchy: issuer and jurisdiction first, permissions second, price third, the rest small.

/** Three rows shaped like the seed's, so the page needs no session to render. */
const SAMPLES: Asset[] = [
  {
    id: 's1',
    public_id: 28,
    seller_id: 'x',
    title: 'German BaFin payment institution',
    description:
      'BaFin-authorised payment institution with acquiring and remittance permissions. Two years of audited accounts.',
    country: 'Germany',
    sector: 'Payment',
    license_type: 'ZAG',
    regulator: 'BaFin',
    asset_kind: 'ACTIVE_BUSINESS',
    business_state: 'ACTIVE',
    year_of_issue: 2023,
    employees: 17,
    asking_price_cents: 220_000_000,
    included_activities: ['Merchant Acquisition', 'Money Remittance'],
    status: 'PUBLISHED',
    validated: true,
    views: 41,
    created_at: '2026-08-14T10:00:00Z',
  },
  {
    id: 's2',
    public_id: 12,
    seller_id: 'x',
    title: 'Lithuanian EMI with SEPA and IBAN issuance',
    description:
      'Bank of Lithuania EMI licence, live SEPA membership and its own IBAN range. Clean regulatory record.',
    country: 'Lithuania',
    sector: 'EMI',
    license_type: 'EMI',
    regulator: 'Bank of Lithuania',
    asset_kind: 'ACTIVE_BUSINESS',
    business_state: 'ACTIVE',
    year_of_issue: 2019,
    employees: 34,
    asking_price_cents: 480_000_000,
    included_activities: ['E-money issuance', 'SEPA payments', 'IBAN issuance'],
    status: 'PUBLISHED',
    validated: true,
    views: 128,
    created_at: '2026-07-02T10:00:00Z',
  },
  {
    id: 's3',
    public_id: 7,
    seller_id: 'x',
    title: 'Estonian crypto licence, never traded',
    description: 'FIU-registered VASP, incorporated and licensed, no operating history.',
    country: 'Estonia',
    sector: 'Crypto',
    license_type: 'VASP',
    regulator: 'FIU',
    asset_kind: 'LICENSE_ONLY',
    business_state: 'NOT_ACTIVE',
    year_of_issue: 2024,
    employees: null,
    asking_price_cents: 9_500_000,
    included_activities: ['Custody', 'Exchange'],
    status: 'PUBLISHED',
    validated: false,
    views: 63,
    created_at: '2026-08-28T10:00:00Z',
  },
]

const PEERS = [
  4_500_000, 9_500_000, 21_000_000, 46_000_000, 88_000_000, 120_000_000, 175_000_000, 220_000_000,
  310_000_000, 480_000_000, 900_000_000,
]

/** Labels this page invents. If a design wins they move into the dictionary properly. */
const WORDS = {
  en: { issued: 'Issued by', permits: 'Permits', seasoned: 'in force since', dearer: 'dearer than' },
  ru: { issued: 'Выдана', permits: 'Разрешает', seasoned: 'действует с', dearer: 'дороже' },
  uk: { issued: 'Видана', permits: 'Дозволяє', seasoned: 'діє з', dearer: 'дорожча за' },
}

function percentile(cents: number, peers: number[]) {
  const below = peers.filter((p) => p < cents).length
  return Math.round((below / Math.max(1, peers.length - 1)) * 100)
}

/**
 * The whole price chart, at the size the sentence it delivers deserves.
 *
 * The full chart spends eleven bars, two axis labels and 200 vertical pixels to say one thing:
 * where this price sits in the range of comparable ones. At card size the position is the finding
 * and the distribution is decoration, so it becomes a track with a marker on it — which reads at a
 * glance and, unlike eleven three-pixel bars, still reads when the screen is small or the eyes are
 * tired. The number is written out beside it, so the graphic is never the only carrier.
 */
function Spark({ pct }: { pct: number }) {
  return (
    <span className="relative block h-1 w-16 shrink-0 rounded-full bg-muted/25" aria-hidden>
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-accent-text/50"
        style={{ width: `${pct}%` }}
      />
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-text ring-2 ring-surface"
        style={{ left: `${pct}%` }}
      />
    </span>
  )
}

/**
 * E — Instrument.
 *
 * Read as a certificate rather than a table. The issuing authority and the jurisdiction are the
 * eyebrow, because that pair IS the product: nobody buys "a payment institution", they buy a
 * German one licensed by BaFin. The title follows in the display cut, and under it the credential
 * line, set in mono the way a registration is printed on the document itself — one row where the
 * ledger spent four bordered boxes.
 *
 * The permissions take the middle of the card at reading size, because two payment institutions
 * in the same country differ by what they are allowed to do and by nothing else shown here.
 *
 * The sector hue is a rule across the top, where a document's header rule goes, rather than the
 * left bar every listing card in every marketplace has.
 */
function Instrument({
  asset,
  peers,
  t,
  w,
}: {
  asset: Asset
  peers: number[]
  t: T
  w: (typeof WORDS)['en']
}) {
  const tone = sectorTone(asset.sector)
  const pct = percentile(asset.asking_price_cents, peers)

  return (
    <article className="group overflow-hidden rounded-xl border bg-surface transition hover:border-accent-text/40">
      <span aria-hidden className={`block h-[3px] w-full ${tone.dot}`} />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">{w.issued}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CountryTag country={asset.country} size="lg" />
              <span className="text-sm font-medium">{asset.regulator ?? t('card.na')}</span>
              <span className="text-sm text-muted">· {asset.country}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {asset.validated && (
              <span
                title={t('card.validatedTitle')}
                className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok ring-1 ring-ok/30"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('card.validated')}
              </span>
            )}
            <span className="font-mono text-xs text-faint">№{asset.public_id}</span>
          </div>
        </div>

        <h2 className="heading mt-4 text-[22px] font-semibold leading-[1.2] sm:text-2xl">
          {asset.title}
        </h2>

        {/* The registration line. One row of mono for what the ledger spent four boxes on, and it
            reads the way a licence is actually cited. */}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
          <span className={`font-medium ${tone.text}`}>{asset.license_type}</span>
          <span className="text-faint">/</span>
          <span>{asset.sector}</span>
          <span className="text-faint">/</span>
          <span>
            {w.seasoned} {asset.year_of_issue ?? '—'}
          </span>
          {asset.employees !== null && (
            <>
              <span className="text-faint">/</span>
              <span>{asset.employees} FTE</span>
            </>
          )}
          <span className="text-faint">/</span>
          <span className={asset.business_state === 'ACTIVE' ? 'text-ok' : 'text-faint'}>
            {asset.business_state === 'ACTIVE' ? t('card.active') : t('card.notActive')}
          </span>
        </p>

        {asset.included_activities.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">{w.permits}</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
              {asset.included_activities.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm">
                  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${tone.text}`} aria-hidden>
                    <path
                      d="M3 8.5l3.5 3.5L13 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-elevated/40 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <p className="font-mono text-2xl font-medium tabular-nums text-accent-text">
            {formatPriceShort(asset.asking_price_cents)}
          </p>
          <Spark pct={pct} />
          <p className="text-xs text-muted">
            {w.dearer} {pct}%
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg">
          {t('card.viewAsset')}
        </span>
      </div>
    </article>
  )
}

/**
 * F — Register.
 *
 * The same information at a fifth of the height, for the case that actually happens: thirty of
 * these down a page. Jurisdiction and sector move into a rail tinted with the sector hue, so they
 * are found by position and colour instead of read. Everything else is two lines and a price.
 *
 * The honest comparison against A is not what it holds but what fits: eight of these on a screen
 * where one and a half of A do.
 */
function Register({
  asset,
  peers,
  t,
  w,
}: {
  asset: Asset
  peers: number[]
  t: T
  w: (typeof WORDS)['en']
}) {
  const tone = sectorTone(asset.sector)
  const pct = percentile(asset.asking_price_cents, peers)

  return (
    <article className="group flex overflow-hidden rounded-xl border bg-surface transition hover:border-accent-text/40">
      <div
        className={`flex w-20 shrink-0 flex-col items-center justify-center gap-1.5 border-r ${tone.bg} py-4`}
      >
        <CountryTag country={asset.country} size="lg" />
        <span className={`font-mono text-[10px] uppercase tracking-wider ${tone.text}`}>
          {asset.sector}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-[15rem] flex-1">
          <h2 className="heading flex items-center gap-2 text-base font-medium leading-snug">
            <span className="truncate">{asset.title}</span>
            {asset.validated && (
              <svg
                viewBox="0 0 16 16"
                className="size-4 shrink-0 text-ok"
                role="img"
                aria-label={t('card.validated')}
              >
                <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
                <path
                  d="M4.5 8.2l2.4 2.4 4.6-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </h2>
          <p className="mt-1 truncate font-mono text-xs text-muted">
            {asset.license_type} · {asset.regulator ?? t('card.na')} · {w.seasoned}{' '}
            {asset.year_of_issue ?? '—'}
            {asset.employees !== null ? ` · ${asset.employees} FTE` : ''}
          </p>
          {asset.included_activities.length > 0 && (
            <p className="mt-1 truncate text-xs text-faint">
              {w.permits}: {asset.included_activities.join(', ')}
            </p>
          )}
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <Spark pct={pct} />
          <div className="text-right">
            <p className="whitespace-nowrap font-mono text-lg font-medium tabular-nums text-accent-text">
              {formatPriceShort(asset.asking_price_cents)}
            </p>
            <p className="whitespace-nowrap text-[11px] text-faint">
              {w.dearer} {pct}%
            </p>
          </div>
          {/* The whole row is the link in the real component, so on a phone — where this button
              is the one thing that will not fit — it simply is not drawn. */}
          <span className="hidden whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg sm:inline-flex">
            {t('card.viewAsset')}
          </span>
        </div>
      </div>
    </article>
  )
}

function Label({
  letter,
  name,
  note,
  height,
}: {
  letter: string
  name: string
  note: string
  height: string
}) {
  return (
    <div
      id={letter.toLowerCase()}
      className="mb-4 mt-16 flex scroll-mt-8 flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-6 first:mt-0 first:border-t-0 first:pt-0"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs text-accent-fg">
        {letter}
      </span>
      <h2 className="heading text-lg font-medium">{name}</h2>
      <span className="rounded-full border px-2 py-0.5 font-mono text-[11px] text-faint">
        {height}
      </span>
      <p className="w-full text-sm text-muted sm:w-auto">{note}</p>
    </div>
  )
}

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const only = (await searchParams).v?.toLowerCase()
  const show = (letter: string) => !only || only === letter

  const t = await getT()
  const locale = await getLocale()
  const tag = intlTag(locale)
  const w = WORDS[locale as keyof typeof WORDS] ?? WORDS.en

  const [a, b, c] = SAMPLES

  return (
    <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-faint">N5Deal / card designs</p>
          <h1 className="display mt-1 text-3xl font-semibold sm:text-4xl">Три карточки</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        A — то, что стоит сейчас. E и F построены не из полей базы, а из того, чем является
        лицензия: инструмент, выданный названным регулятором в названной юрисдикции и разрешающий
        названные операции. Отсюда порядок: кто выдал, что разрешает, сколько стоит.
      </p>

      {show('a') && (
        <Label
          letter="A"
          name="Сейчас"
          height="680px"
          note="Девять полос одного веса. Страна и сектор написаны дважды."
        />
      )}
      {show('a') && <AssetCard t={t} tag={tag} asset={a} peersCents={PEERS} matchScore={100} />}

      {show('e') && (
        <Label
          letter="E"
          name="Свидетельство"
          height="215px"
          note="Регулятор и юрисдикция сверху, разрешения в центре, цена и место в рынке одной строкой."
        />
      )}
      {show('e') && (
        <div className="grid gap-4">
          <Instrument asset={a} peers={PEERS} t={t} w={w} />
          <Instrument asset={c} peers={PEERS} t={t} w={w} />
        </div>
      )}

      {show('f') && (
        <Label
          letter="F"
          name="Реестр"
          height="96px"
          note="То же самое, но восемь штук на экран вместо полутора."
        />
      )}
      {show('f') && (
        <div className="grid gap-3">
          <Register asset={a} peers={PEERS} t={t} w={w} />
          <Register asset={b} peers={PEERS} t={t} w={w} />
          <Register asset={c} peers={PEERS} t={t} w={w} />
        </div>
      )}
    </main>
  )
}
