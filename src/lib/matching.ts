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

import type { Asset, BuyerProfile } from './types'

export type MatchReason = { label: string; hit: boolean }
export type Match = { score: number; reasons: MatchReason[] }

const WEIGHT = { sector: 45, jurisdiction: 30, price: 25 }

export function matchAssetToBuyer(asset: Asset, buyer: BuyerProfile): Match {
  const reasons: MatchReason[] = []
  let score = 0

  const sectorHit = buyer.sectors.length === 0 || buyer.sectors.includes(asset.sector)
  if (sectorHit) score += WEIGHT.sector
  reasons.push({
    label: buyer.sectors.length ? `Sector ${asset.sector}` : 'No sector restriction',
    hit: sectorHit,
  })

  const jurisdictionHit =
    buyer.jurisdictions.length === 0 || buyer.jurisdictions.includes(asset.country)
  if (jurisdictionHit) score += WEIGHT.jurisdiction
  reasons.push({
    label: buyer.jurisdictions.length ? `Jurisdiction ${asset.country}` : 'Any jurisdiction',
    hit: jurisdictionHit,
  })

  // The mandate stores whole euros, the asset stores cents.
  const priceEur = asset.asking_price_cents / 100
  const min = buyer.ticket_min_eur
  const max = buyer.ticket_max_eur
  const priceHit = (min === null || priceEur >= min) && (max === null || priceEur <= max)
  if (priceHit) score += WEIGHT.price
  reasons.push({ label: 'Inside ticket range', hit: priceHit })

  return { score, reasons }
}

/** Ranks published listings for one buyer, strongest first. */
export function rankForBuyer(assets: Asset[], buyer: BuyerProfile) {
  return assets
    .map((asset) => ({ asset, match: matchAssetToBuyer(asset, buyer) }))
    .sort((a, b) => b.match.score - a.match.score)
}

/** The mirror direction: which buyers should a seller approach about this listing. */
export function rankBuyersForAsset(
  asset: Asset,
  buyers: (BuyerProfile & { profileName: string })[],
) {
  return buyers
    .map((buyer) => ({ buyer, match: matchAssetToBuyer(asset, buyer) }))
    .sort((a, b) => b.match.score - a.match.score)
}
