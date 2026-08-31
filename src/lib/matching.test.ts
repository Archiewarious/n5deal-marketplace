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

// Regression. A blank axis used to add its full weight, so a mandate with nothing filled in
// scored 100% against every listing in the catalogue — the most confident possible number on
// the least possible information. A blank axis is an absence of criteria, not a match.
test('a blank axis carries no weight and is not counted', () => {
  const noSector = buyer({ sectors: [] })
  // only jurisdiction (30) and price (25) are stated, and both hit
  assert.equal(matchAssetToBuyer(asset(), noSector).score, 100)
  // the same mandate against a listing that misses the jurisdiction: 25 of 55
  assert.equal(matchAssetToBuyer(asset({ country: 'Malta' }), noSector).score, 45)
  assert.equal(matchAssetToBuyer(asset(), noSector).reasons.length, 2)
})

test('a mandate with no criteria at all scores null, never 100', () => {
  const empty = buyer({ sectors: [], jurisdictions: [], ticket_min_eur: null, ticket_max_eur: null })
  const m = matchAssetToBuyer(asset({ sector: 'Crypto', country: 'Seychelles' }), empty)
  assert.equal(m.score, null)
  assert.deepEqual(m.reasons, [])
})

test('listings are not reordered when the mandate says nothing', () => {
  const empty = buyer({ sectors: [], jurisdictions: [], ticket_min_eur: null, ticket_max_eur: null })
  const ranked = rankForBuyer([asset({ id: 'first' }), asset({ id: 'second' })], empty)
  assert.deepEqual(ranked.map((r) => r.asset.id), ['first', 'second'])
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
