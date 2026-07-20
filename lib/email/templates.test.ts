import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invitationEmail } from './templates.ts'

test('builds a subject referencing the organization name', () => {
  const { subject } = invitationEmail({ organizationName: 'Acme Co', inviteUrl: 'https://example.com/invite/1' })
  assert.match(subject, /Acme Co/)
})

test('escapes HTML in the organization name to avoid injection into the email body', () => {
  const { html } = invitationEmail({ organizationName: '<script>alert(1)</script>', inviteUrl: 'https://example.com/invite/1' })
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
})

test('includes the invite URL as a link', () => {
  const { html } = invitationEmail({ organizationName: 'Acme', inviteUrl: 'https://example.com/invite/1' })
  assert.match(html, /href="https:\/\/example\.com\/invite\/1"/)
})
