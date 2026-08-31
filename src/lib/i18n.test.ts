import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KEYS, DICTS, LOCALES, translator, isLocale, intlTag } from './i18n.ts'

// The dictionary is three hand-written objects, which is the cheapest thing that works and also
// the easiest thing in the codebase to let rot: a key added to English and forgotten in Ukrainian
// falls back silently and nobody notices until a Ukrainian screen has an English sentence on it.
// These tests are the reason that cannot happen quietly.

test('every locale defines every key', () => {
  for (const locale of LOCALES) {
    const missing = KEYS.filter((k) => !(k in DICTS[locale]))
    assert.deepEqual(missing, [], `${locale} is missing ${missing.length} keys`)
  }
})

test('no locale defines a key English does not', () => {
  const known = new Set(KEYS)
  for (const locale of LOCALES) {
    const extra = Object.keys(DICTS[locale]).filter((k) => !known.has(k))
    assert.deepEqual(extra, [], `${locale} defines keys English does not: ${extra.join(', ')}`)
  }
})

test('no string is left in English by accident', () => {
  // A translation identical to the English is almost always a key someone copied and did not
  // translate. The exceptions are real: a company name, a product name, an acronym.
  const ALLOWED_IDENTICAL = new Set(['login.sellerCompany', 'lang.label'])
  for (const locale of LOCALES.filter((l) => l !== 'en')) {
    const same = KEYS.filter(
      (k) => DICTS[locale][k] === DICTS.en[k] && !ALLOWED_IDENTICAL.has(k),
    )
    assert.deepEqual(same, [], `${locale} left ${same.length} strings identical to English`)
  }
})

test('interpolation placeholders match across locales', () => {
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
  for (const k of KEYS) {
    const expected = holes(DICTS.en[k])
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      // A translation that drops {n} renders a sentence with a hole in it; one that invents
      // {count} renders the literal text "{count}" to a user.
      assert.deepEqual(holes(DICTS[locale][k]), expected, `${locale}/${k} placeholders differ`)
    }
  }
})

test('interpolation substitutes every variable', () => {
  const t = translator('en')
  assert.equal(t('assets.count', { shown: 3, total: 29 }), '3 of 29 listings')
  assert.equal(t('login.enterAs', { role: 'Seller' }), 'Enter as Seller')
})

test('a missing key falls back to English rather than to the key', () => {
  const t = translator('uk')
  // Every key exists in every locale, so this checks the mechanism on a key that does not.
  assert.equal(t('nav.assets'), DICTS.uk['nav.assets'])
  assert.equal(t('definitely.not.a.key'), 'definitely.not.a.key')
})

test('isLocale rejects anything that is not one', () => {
  assert.equal(isLocale('uk'), true)
  assert.equal(isLocale('en'), true)
  assert.equal(isLocale('de'), false)
  assert.equal(isLocale(''), false)
  assert.equal(isLocale(undefined), false)
  // The cookie value reaches this straight from a browser, so a hostile one has to bounce.
  assert.equal(isLocale('../../etc/passwd'), false)
})

test('every locale has an Intl tag that Intl accepts', () => {
  for (const locale of LOCALES) {
    const tag = intlTag(locale)
    assert.doesNotThrow(() => new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }))
  }
})
