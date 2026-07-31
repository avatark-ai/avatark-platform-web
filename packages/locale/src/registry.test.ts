import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LOCALE_REGISTRY } from './registry.ts'
import { getSelectableLocales, isLocaleSelectable, validateResourceCompleteness } from './helpers.ts'

test('en-US and en-IN are the only available locales', () => {
  const available = LOCALE_REGISTRY.filter((l) => l.availability === 'available').map((l) => l.code)
  assert.deepEqual(available.sort(), ['en-IN', 'en-US'])
})

test('es/fr/hi/te/ta are all planned, not preview or available', () => {
  for (const code of ['es', 'fr', 'hi', 'te', 'ta']) {
    const entry = LOCALE_REGISTRY.find((l) => l.code === code)
    assert.ok(entry, `${code} missing from registry`)
    assert.equal(entry.availability, 'planned')
  }
})

test('getSelectableLocales matches isLocaleSelectable for every registry entry', () => {
  const selectable = getSelectableLocales().map((l) => l.code)
  for (const locale of LOCALE_REGISTRY) {
    assert.equal(selectable.includes(locale.code), isLocaleSelectable(locale.code))
  }
})

test('planned locales are never selectable', () => {
  assert.equal(isLocaleSelectable('es'), false)
  assert.equal(isLocaleSelectable('hi'), false)
})

test('en-US resource bundle is complete against itself', () => {
  const result = validateResourceCompleteness('en-US')
  assert.equal(result.complete, true)
  assert.deepEqual(result.missing, [])
})

test('en-IN reuses en-US resource bundle and is complete', () => {
  const result = validateResourceCompleteness('en-IN')
  assert.equal(result.complete, true)
})

test('unregistered locale reports incomplete, not a crash', () => {
  const result = validateResourceCompleteness('xx-XX')
  assert.equal(result.complete, false)
  assert.ok(result.missing.length > 0)
})
