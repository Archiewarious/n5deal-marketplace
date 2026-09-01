import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pricePercentile } from './rank'

test('the cheapest listing is 0 and the dearest is 100', () => {
  const peers = [100, 200, 300, 400]
  assert.equal(pricePercentile(100, peers), 0)
  assert.equal(pricePercentile(400, peers), 100)
})

test('the divisor is the other listings, not the whole set', () => {
  // 300 is dearer than two of the other three, so two thirds, not two quarters.
  assert.equal(pricePercentile(300, [100, 200, 300, 400]), 67)
})

test('ties are counted as ties rather than ordered', () => {
  // Three listings share a price. None of them is dearer than the others, and all three get the
  // same answer — the alternative is a ranking decided by whatever the sort happened to do.
  const peers = [100, 200, 200, 200, 500]
  assert.equal(pricePercentile(200, peers), 25)
})

test('nothing to compare against returns null rather than a number', () => {
  assert.equal(pricePercentile(100, [100]), null)
  assert.equal(pricePercentile(100, []), null)
})

test('a set that does not contain the listing still divides by its own length', () => {
  // The card passes the sector's prices, which include this one. The editor preview passes a set
  // that does not, because the row is not saved yet.
  assert.equal(pricePercentile(250, [100, 200, 300, 400]), 50)
})
