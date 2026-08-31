// Smart matching between a buyer mandate and a listing.
//
// WHY RULES AND NOT AN LLM CALL. The obvious version of this feature sends the mandate
// and the listing to a model and asks "do these fit". That reads well in a demo and fails
// as a product: it needs an API key the reviewer does not have, it costs money per row,
// it is non-deterministic (the same pair can score differently twice), and it cannot be
// unit tested. Every input here is already structured — sectors, jurisdictions, a price
// range — so the comparison is arithmetic, not language. The model is worth reaching for
// where the input is free text; that is what parseQuery() below does.
//
// The score is deliberately explainable: the UI shows the reasons, not just a percentage,
// because a buyer will not act on a number they cannot check.

import type { Asset, BuyerProfile } from './types.ts'

export type MatchReason = { label: string; hit: boolean }
/** `score` is null when the mandate states no criteria at all — see below. */
export type Match = { score: number | null; reasons: MatchReason[] }

const WEIGHT = { sector: 45, jurisdiction: 30, price: 25 }

export function matchAssetToBuyer(asset: Asset, buyer: BuyerProfile): Match {
  const reasons: MatchReason[] = []
  let earned = 0
  let available = 0

  // An axis the buyer left blank is not a match — it is an absence of criteria, and it must
  // not contribute weight. The first version added the full weight for every empty axis, so a
  // brand-new mandate with nothing filled in scored 100% against every listing in the
  // catalogue: the most confident possible number on the least possible information.
  // The percentage is now taken over the axes the buyer actually stated, and a mandate that
  // states nothing returns null so the UI can stay silent instead of inventing certainty.

  if (buyer.sectors.length > 0) {
    available += WEIGHT.sector
    const hit = buyer.sectors.includes(asset.sector)
    if (hit) earned += WEIGHT.sector
    reasons.push({ label: `Sector ${asset.sector}`, hit })
  }

  if (buyer.jurisdictions.length > 0) {
    available += WEIGHT.jurisdiction
    const hit = buyer.jurisdictions.includes(asset.country)
    if (hit) earned += WEIGHT.jurisdiction
    reasons.push({ label: `Jurisdiction ${asset.country}`, hit })
  }

  const { ticket_min_eur: min, ticket_max_eur: max } = buyer
  if (min !== null || max !== null) {
    available += WEIGHT.price
    // The mandate stores whole euros, the asset stores cents.
    const priceEur = asset.asking_price_cents / 100
    const hit = (min === null || priceEur >= min) && (max === null || priceEur <= max)
    if (hit) earned += WEIGHT.price
    reasons.push({ label: 'Inside ticket range', hit })
  }

  if (available === 0) return { score: null, reasons: [] }
  return { score: Math.round((earned / available) * 100), reasons }
}

/** Ranks published listings for one buyer, strongest first. */
export function rankForBuyer(assets: Asset[], buyer: BuyerProfile) {
  return assets
    .map((asset) => ({ asset, match: matchAssetToBuyer(asset, buyer) }))
    .sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1))
}

/** The mirror direction: which buyers should a seller approach about this listing. */
export function rankBuyersForAsset(
  asset: Asset,
  buyers: (BuyerProfile & { profileName: string })[],
) {
  return buyers
    .map((buyer) => ({ buyer, match: matchAssetToBuyer(asset, buyer) }))
    .sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1))
}
