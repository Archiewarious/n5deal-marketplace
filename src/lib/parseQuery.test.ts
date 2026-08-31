import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuery } from './parseQuery.ts'

test('pulls sector, country and price ceiling out of one sentence', () => {
  const q = parseQuery('crypto licence in Poland under 500k')
  assert.equal(q.sector, 'Crypto')
  assert.equal(q.country, 'Poland')
  assert.equal(q.maxPriceCents, 50_000_000)
})

// Regression. The line above is the placeholder text of the search box, and it used to leave
// "licence" behind as a hard text filter — which matched no listing, so the suggested query
// returned an empty catalogue.
test('category nouns never survive into the text filter', () => {
  for (const word of ['licence', 'license', 'asset', 'business', 'company', 'deal']) {
    assert.equal(parseQuery(`crypto ${word} in Poland`).text, '', `"${word}" leaked into text`)
  }
})

test('keeps words that genuinely narrow the search', () => {
  assert.equal(parseQuery('crypto custody in Germany').text, 'custody')
})

test('reads a lower bound as well as an upper one', () => {
  const q = parseQuery('payment over 1M')
  assert.equal(q.minPriceCents, 100_000_000)
  assert.equal(q.maxPriceCents, null)
})

test('an empty query filters nothing', () => {
  const q = parseQuery('   ')
  assert.deepEqual(q, {
    sector: null,
    country: null,
    maxPriceCents: null,
    minPriceCents: null,
    text: '',
  })
})

test('matches sector and country regardless of case', () => {
  const q = parseQuery('EMI in lithuania')
  assert.equal(q.sector, 'EMI')
  assert.equal(q.country, 'Lithuania')
})

test('a two-word country is recognised', () => {
  assert.equal(parseQuery('payment in United Kingdom').country, 'United Kingdom')
})
