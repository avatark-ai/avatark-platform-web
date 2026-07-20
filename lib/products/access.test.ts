import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeProductAccess } from './access.ts'

test('tallies grants per product, active status, and admin grantees', () => {
  const grants = [
    { user_id: 'u1', product_id: 'prometheusk', status: 'active' },
    { user_id: 'u2', product_id: 'prometheusk', status: 'revoked' },
    { user_id: 'u2', product_id: 'gamek', status: 'active' },
  ]
  const roles = [{ user_id: 'u1', role: 'admin' }]

  const result = summarizeProductAccess(grants, roles)

  assert.deepEqual(result.get('prometheusk'), { totalGrants: 2, activeGrants: 1, adminGrantees: 1 })
  assert.deepEqual(result.get('gamek'), { totalGrants: 1, activeGrants: 1, adminGrantees: 0 })
})

test('returns an empty map for no grants', () => {
  assert.deepEqual(summarizeProductAccess([], []), new Map())
})
