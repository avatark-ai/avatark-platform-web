import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmail } from './sendEmail.ts'

test('does nothing when EMAIL_SENDING_ENABLED is not "true", even with a key present', async () => {
  const result = await sendEmail(
    { to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' },
    { RESEND_API_KEY: 'key', EMAIL_FROM_ADDRESS: 'hello@avatark.ai' }
  )
  assert.deepEqual(result, { sent: false, reason: 'disabled' })
})

test('reports not_configured when enabled but missing the API key', async () => {
  const result = await sendEmail(
    { to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' },
    { EMAIL_SENDING_ENABLED: 'true', EMAIL_FROM_ADDRESS: 'hello@avatark.ai' }
  )
  assert.deepEqual(result, { sent: false, reason: 'not_configured' })
})

test('reports not_configured when enabled but missing the sender address', async () => {
  const result = await sendEmail(
    { to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' },
    { EMAIL_SENDING_ENABLED: 'true', RESEND_API_KEY: 'key' }
  )
  assert.deepEqual(result, { sent: false, reason: 'not_configured' })
})

test('calls the Resend API and reports sent:true on success', async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    capturedUrl = url
    capturedBody = JSON.parse(init.body as string)
    return new Response('{}', { status: 200 })
  }) as typeof fetch

  try {
    const result = await sendEmail(
      { to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' },
      { EMAIL_SENDING_ENABLED: 'true', RESEND_API_KEY: 'key', EMAIL_FROM_ADDRESS: 'hello@avatark.ai', EMAIL_FROM_NAME: 'AvatarK' }
    )
    assert.deepEqual(result, { sent: true })
    assert.equal(capturedUrl, 'https://api.resend.com/emails')
    assert.equal((capturedBody as { from: string }).from, 'AvatarK <hello@avatark.ai>')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('reports send_failed when the Resend API call fails', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('bad request', { status: 400 })) as typeof fetch

  try {
    const result = await sendEmail(
      { to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' },
      { EMAIL_SENDING_ENABLED: 'true', RESEND_API_KEY: 'key', EMAIL_FROM_ADDRESS: 'hello@avatark.ai' }
    )
    assert.equal(result.sent, false)
    assert.equal((result as { reason: string }).reason, 'send_failed')
  } finally {
    globalThis.fetch = originalFetch
  }
})
