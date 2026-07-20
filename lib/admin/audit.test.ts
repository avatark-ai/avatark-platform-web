import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentAuditEnvironment } from './audit.ts'

test('uses VERCEL_ENV when present', () => {
  assert.equal(currentAuditEnvironment({ VERCEL_ENV: 'preview' }), 'preview')
})

test('falls back to local when VERCEL_ENV is unset', () => {
  assert.equal(currentAuditEnvironment({}), 'local')
})
