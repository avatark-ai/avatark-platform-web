import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyHealthCheck } from './health.ts'

test('classifies a 2xx response as reachable', () => {
  assert.deepEqual(classifyHealthCheck({ ok: true, status: 200 }), { state: 'reachable', detail: 'HTTP 200' })
})

test('classifies a non-ok response as unreachable', () => {
  assert.deepEqual(classifyHealthCheck({ ok: false, status: 500 }), { state: 'unreachable', detail: 'HTTP 500' })
})

test('classifies a network error as unreachable', () => {
  assert.deepEqual(classifyHealthCheck({ error: 'fetch failed' }), { state: 'unreachable', detail: 'fetch failed' })
})
