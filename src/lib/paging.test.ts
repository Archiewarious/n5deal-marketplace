import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampPage, pageCount } from './paging.ts'

// This whole file exists because of one bug. The clamp used to be an inline expression in the
// catalogue with a comment claiming it was "clamped rather than trusted", and it clamped the
// range while ignoring the type — so every case below the first block used to pass straight
// through into a slice() call.

test('an ordinary page number survives', () => {
  assert.equal(clampPage('2', 4), 2)
  assert.equal(clampPage('1', 4), 1)
  assert.equal(clampPage('4', 4), 4)
})

test('out of range is pulled back in', () => {
  assert.equal(clampPage('0', 4), 1)
  assert.equal(clampPage('-3', 4), 1)
  assert.equal(clampPage('999', 4), 4)
})

// Regression. Number('2.7') is 2.7 and neither Math.min nor Math.max rounds, so from became
// 13.600000000000001, slice returned a window straddling two pages, the count line rendered
// "Showing 14.600000000000001-21.6", and aria-current matched no integer slot at all.
test('a fractional page cannot reach the slice', () => {
  for (const raw of ['2.7', '1.5', '3.0', '.5', '2e0']) {
    assert.equal(Number.isInteger(clampPage(raw, 4)), true, `${raw} produced a non-integer`)
  }
  assert.equal(clampPage('2.7', 4), 1)
})

test('one page has one URL', () => {
  // Number() accepts all of these and lands them in range, which does no damage and gives the
  // same page several addresses. Strict parse, so they all fall back to the first page.
  for (const raw of ['0x2', '+2', ' 2 ', '2 ', 'Infinity', '1e2', '２']) {
    assert.equal(clampPage(raw, 4), raw === ' 2 ' || raw === '2 ' ? 2 : 1, `${raw}`)
  }
})

test('junk and emptiness fall back to the first page', () => {
  for (const raw of ['', 'abc', 'null', 'undefined', 'NaN', '../../etc', '<script>']) {
    assert.equal(clampPage(raw, 4), 1, `${raw}`)
  }
})

test('a nonsense page total still yields a usable page', () => {
  assert.equal(clampPage('3', 0), 1)
  assert.equal(clampPage('3', -1), 1)
  assert.equal(clampPage('3', Number.NaN), 1)
})

test('page count is never zero, so an empty list still renders one page', () => {
  assert.equal(pageCount(0, 8), 1)
  assert.equal(pageCount(1, 8), 1)
  assert.equal(pageCount(8, 8), 1)
  // The exact-multiple boundary: 16 rows at 8 a page is two pages, not three.
  assert.equal(pageCount(16, 8), 2)
  assert.equal(pageCount(17, 8), 3)
  assert.equal(pageCount(29, 8), 4)
})
