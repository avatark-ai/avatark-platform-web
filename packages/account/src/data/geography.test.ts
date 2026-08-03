// Run with: node --experimental-strip-types --test packages/account/src/data/geography.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTRY_OPTIONS, getStatesForCountry, getCitiesForState, guessTimezone, filterOptions } from './geography.ts'

test('COUNTRY_OPTIONS has no duplicate codes and every entry is well-formed', () => {
  const codes = COUNTRY_OPTIONS.map((c) => c.value)
  assert.equal(new Set(codes).size, codes.length)
  for (const c of COUNTRY_OPTIONS) {
    assert.ok(c.value.length === 2, `expected a 2-letter code, got "${c.value}"`)
    assert.ok(c.label.length > 0)
  }
  assert.ok(COUNTRY_OPTIONS.length > 150, 'expected a broad, near-complete country list')
})

test('getStatesForCountry returns real data for covered countries, null otherwise (never a fabricated empty list)', () => {
  assert.ok((getStatesForCountry('US') ?? []).length === 51)
  assert.ok((getStatesForCountry('CA') ?? []).length > 0)
  assert.ok((getStatesForCountry('IN') ?? []).length > 0)
  assert.ok((getStatesForCountry('AU') ?? []).length > 0)
  assert.equal(getStatesForCountry('FR'), null)
  assert.equal(getStatesForCountry(null), null)
})

test('getCitiesForState returns real data only where curated, null otherwise', () => {
  assert.ok((getCitiesForState('US', 'CA') ?? []).length > 0)
  assert.ok((getCitiesForState('IN', 'UP') ?? []).some((c) => c.label === 'Vrindavan'))
  assert.equal(getCitiesForState('US', 'ZZ'), null)
  assert.equal(getCitiesForState('FR', 'ZZ'), null)
  assert.equal(getCitiesForState(null, null), null)
})

test('guessTimezone is best-effort, never throws, null when unknown', () => {
  assert.equal(guessTimezone('US', 'CA'), 'America/Los_Angeles')
  assert.equal(guessTimezone('IN', null), 'Asia/Kolkata')
  assert.equal(guessTimezone('ZZ', null), null)
  assert.equal(guessTimezone(null, null), null)
})

test('filterOptions is a case-insensitive substring match over label or value', () => {
  const options = [{ value: 'US', label: 'United States' }, { value: 'FR', label: 'France' }]
  assert.deepEqual(filterOptions('fra', options), [{ value: 'FR', label: 'France' }])
  assert.deepEqual(filterOptions('us', options), [{ value: 'US', label: 'United States' }])
  assert.deepEqual(filterOptions('', options), options)
  assert.deepEqual(filterOptions('zzz', options), [])
})
