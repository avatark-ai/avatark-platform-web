import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getConsumerFacingModes, isModeConsumerFacing, resolveConsumerMode, getProductAccent } from './helpers.ts'

test('getConsumerFacingModes returns only system and dark', () => {
  const modes = getConsumerFacingModes().map((m) => m.mode).sort()
  assert.deepEqual(modes, ['dark', 'system'])
})

test('isModeConsumerFacing rejects light and high-contrast', () => {
  assert.equal(isModeConsumerFacing('system'), true)
  assert.equal(isModeConsumerFacing('dark'), true)
  assert.equal(isModeConsumerFacing('light'), false)
  assert.equal(isModeConsumerFacing('high-contrast'), false)
})

test('resolveConsumerMode falls back to default for internal/planned/unknown stored values', () => {
  assert.equal(resolveConsumerMode('dark'), 'dark')
  assert.equal(resolveConsumerMode('light'), 'system')
  assert.equal(resolveConsumerMode('high-contrast'), 'system')
  assert.equal(resolveConsumerMode(null), 'system')
  assert.equal(resolveConsumerMode('nonsense'), 'system')
})

test('getProductAccent is independent of any appearance mode -- same lookup regardless of caller state', () => {
  const a1 = getProductAccent('cinemak')
  const a2 = getProductAccent('cinemak')
  assert.deepEqual(a1, a2)
  assert.equal(a1?.accentName, 'cinematic')
  assert.equal(getProductAccent('setpointk')?.accentName, 'physiological-intelligence')
  assert.equal(getProductAccent('not-a-product'), undefined)
})
