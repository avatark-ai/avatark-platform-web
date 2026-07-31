import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyInvitationStatus } from './invitations.ts'

const now = new Date('2026-07-20T00:00:00Z')

test('revoked takes priority over everything else', () => {
  const status = classifyInvitationStatus(
    { accepted_at: '2026-07-19T00:00:00Z', revoked_at: '2026-07-19T12:00:00Z', expires_at: '2026-08-01T00:00:00Z' },
    now
  )
  assert.equal(status, 'revoked')
})

test('accepted when accepted_at is set and not revoked', () => {
  const status = classifyInvitationStatus(
    { accepted_at: '2026-07-19T00:00:00Z', revoked_at: null, expires_at: '2026-08-01T00:00:00Z' },
    now
  )
  assert.equal(status, 'accepted')
})

test('expired when past expires_at and not accepted/revoked', () => {
  const status = classifyInvitationStatus({ accepted_at: null, revoked_at: null, expires_at: '2026-07-01T00:00:00Z' }, now)
  assert.equal(status, 'expired')
})

test('pending otherwise', () => {
  const status = classifyInvitationStatus({ accepted_at: null, revoked_at: null, expires_at: '2026-08-01T00:00:00Z' }, now)
  assert.equal(status, 'pending')
})
