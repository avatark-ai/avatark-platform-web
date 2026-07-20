// Run with: node --experimental-strip-types --test lib/auth/safeReturnPath.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath } from './safeReturnPath.ts'

test('accepts a plain relative path', () => {
  assert.equal(safeReturnPath('/account', '/fallback'), '/account')
})

test('accepts a relative path with a query string', () => {
  assert.equal(safeReturnPath('/account?tab=privacy', '/fallback'), '/account?tab=privacy')
})

test('falls back on null/undefined/empty input', () => {
  assert.equal(safeReturnPath(null, '/fallback'), '/fallback')
  assert.equal(safeReturnPath(undefined, '/fallback'), '/fallback')
  assert.equal(safeReturnPath('', '/fallback'), '/fallback')
})

test('rejects a protocol-relative URL (open redirect)', () => {
  assert.equal(safeReturnPath('//evil.example.com', '/fallback'), '/fallback')
})

test('rejects an absolute URL with a scheme', () => {
  assert.equal(safeReturnPath('https://evil.example.com', '/fallback'), '/fallback')
  assert.equal(safeReturnPath('javascript://alert(1)', '/fallback'), '/fallback')
})

test('rejects a path missing the leading slash', () => {
  assert.equal(safeReturnPath('account', '/fallback'), '/fallback')
})

test('rejects a backslash-based open-redirect trick', () => {
  // Browsers (and Node's URL parser) treat a backslash as a path
  // separator for special schemes during relative-URL resolution, so
  // "/\evil.example.com" resolves to a completely different host even
  // though it passes a naive "starts with // "-only check.
  assert.equal(safeReturnPath('/\\evil.example.com', '/fallback'), '/fallback')
})

test('normalizes but keeps a path containing ../ that stays within the origin', () => {
  assert.equal(safeReturnPath('/a/../../evil', '/fallback'), '/evil')
})
