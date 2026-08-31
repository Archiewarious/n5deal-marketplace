import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatPriceShort, formatPriceFull, parsePriceToCents } from './format.ts'

test('shortens prices the way the reference marketplace does', () => {
  assert.equal(formatPriceShort(4_000_000), '€40K')
  assert.equal(formatPriceShort(250_000_000), '€2.5M')
  assert.equal(formatPriceShort(1_250_000_000), '€12.5M')
})

test('a price below a thousand euro stays exact', () => {
  assert.equal(formatPriceShort(50_000), '€500')
})

test('the full form is grouped and has no cents', () => {
  assert.equal(formatPriceFull(250_000_000), '€2,500,000')
})

test('accepts the shapes people actually type', () => {
  assert.equal(parsePriceToCents('2.5M'), 250_000_000)
  assert.equal(parsePriceToCents('400k'), 40_000_000)
  assert.equal(parsePriceToCents('40000'), 4_000_000)
  assert.equal(parsePriceToCents('1 200 000'), 120_000_000)
  assert.equal(parsePriceToCents('1,200,000'), 120_000_000)
})

// A price that cannot be read must return null rather than 0 or NaN: the catalogue decides
// between "no cap" and "unreadable, tell the user" on exactly this distinction.
test('junk is rejected, not coerced', () => {
  for (const junk of ['abc', '', '  ', '2.5.5M', '$40k', '40kk', '-100']) {
    assert.equal(parsePriceToCents(junk), null, `"${junk}" should not parse`)
  }
})

test('round trips through both directions', () => {
  const cents = parsePriceToCents('2.5M')!
  assert.equal(formatPriceShort(cents), '€2.5M')
})
