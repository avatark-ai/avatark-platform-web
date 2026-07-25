import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findSiteByHost } from './registry.ts'

test('matches the canonical institutional host', () => {
  assert.equal(findSiteByHost('avatark.ai')?.id, 'institutional')
})

test('matches the canonical echo host', () => {
  assert.equal(findSiteByHost('echo.avatark.ai')?.id, 'echo')
})

test('matches echo legacy host next.avatark.ai', () => {
  assert.equal(findSiteByHost('next.avatark.ai')?.id, 'echo')
})

test('strips a port before matching', () => {
  assert.equal(findSiteByHost('echo.avatark.ai:3000')?.id, 'echo')
})

test('is case-insensitive', () => {
  assert.equal(findSiteByHost('ECHO.AVATARK.AI')?.id, 'echo')
})

test('returns null for an unrecognized host', () => {
  assert.equal(findSiteByHost('localhost'), null)
})
