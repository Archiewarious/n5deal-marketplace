import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchAssetToBuyer, rankForBuyer } from './matching.ts'
import type { Asset, BuyerProfile } from './types.ts'

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 'a',
  public_id: 1,
  seller_id: 's',
  title: 'Lithuanian EMI',
  description: null,
  country: 'Lithuania',
  sector: 'EMI',
  license_type: 'EMI',
  regulator: null,
  asset_kind: 'ACTIVE_BUSINESS',
  business_state: 'ACTIVE',
  year_of_issue: 2023,
  employees: 24,
  asking_price_cents: 390_000_000, // €3.9M
  included_activities: [],
  status: 'PUBLISHED',
  validated: true,
  views: 0,
  created_at: '2026-08-01T00:00:00Z',
  ...over,
})

const buyer = (over: Partial<BuyerProfile> = {}): BuyerProfile => ({
  user_id: 'b',
  headline: null,
  description: null,
  sectors: ['Payment', 'EMI'],
  jurisdictions: ['Lithuania', 'Ireland'],
  ticket_min_eur: 500_000,
  ticket_max_eur: 4_000_000,
  updated_at: '2026-08-01T00:00:00Z',
  ...over,
})

test('all three axes hit gives a perfect score', () => {
  assert.equal(matchAssetToBuyer(asset(), buyer()).score, 100)
})

test('each axis is worth its stated weight', () => {
  assert.equal(matchAssetToBuyer(asset({ sector: 'Bank' }), buyer()).score, 55)
  assert.equal(matchAssetToBuyer(asset({ country: 'Malta' }), buyer()).score, 70)
  // €470K sits below the €500K floor of the mandate
  assert.equal(matchAssetToBuyer(asset({ asking_price_cents: 47_000_000 }), buyer()).score, 75)
})

test('an empty mandate axis matches everything rather than nothing', () => {
  const open = buyer({ sectors: [], jurisdictions: [], ticket_min_eur: null, ticket_max_eur: null })
  assert.equal(matchAssetToBuyer(asset({ sector: 'Crypto', country: 'Seychelles' }), open).score, 100)
})

test('a price exactly on the boundary counts as inside', () => {
  const b = buyer({ ticket_min_eur: 1_000_000, ticket_max_eur: 2_000_000 })
  assert.equal(matchAssetToBuyer(asset({ asking_price_cents: 100_000_000 }), b).score, 100)
  assert.equal(matchAssetToBuyer(asset({ asking_price_cents: 200_000_000 }), b).score, 100)
  assert.equal(matchAssetToBuyer(asset({ asking_price_cents: 200_000_100 }), b).score, 75)
})

// The score is shown to a buyer with its reasons; a number without them is not actionable.
test('every axis reports whether it hit', () => {
  const m = matchAssetToBuyer(asset({ sector: 'Bank' }), buyer())
  assert.equal(m.reasons.length, 3)
  assert.equal(m.reasons.filter((r) => r.hit).length, 2)
  assert.ok(m.reasons.some((r) => r.label.includes('Bank') && !r.hit))
})

test('ranking puts the strongest fit first', () => {
  const ranked = rankForBuyer(
    [asset({ id: 'weak', sector: 'Bank', country: 'Malta' }), asset({ id: 'strong' })],
    buyer(),
  )
  assert.equal(ranked[0].asset.id, 'strong')
  assert.equal(ranked[1].asset.id, 'weak')
})
