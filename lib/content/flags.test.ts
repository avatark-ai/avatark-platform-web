import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isInstitutionalSignInEnabled } from './flags.ts'

test('institutional Sign In is off by default', () => {
  for (const v of [undefined, '', 'false', 'TRUE', '1', 'yes', ' true']) {
    assert.equal(isInstitutionalSignInEnabled(v), false, String(v))
  }
})

test('institutional Sign In is on only for the exact string "true"', () => {
  assert.equal(isInstitutionalSignInEnabled('true'), true)
})
