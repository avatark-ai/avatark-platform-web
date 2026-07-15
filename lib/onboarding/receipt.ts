// ============================================================
// AvatarK Platform -- RC5 onboarding completion receipt verification.
//
// Verifies the narrow, short-lived, HMAC-signed receipt issued by
// PrometheusK's POST /api/onboarding/receipt (prometheusk-web,
// lib/onboarding/receipt.ts). This is NOT an authentication token --
// it proves one thing only: the canonical onboarding practice was
// completed. See docs/RC5_HANDOFF_CONTRACT.md for the full contract.
//
// Deliberately mirrors prometheusk-web's signing module (same format,
// same secret, same claim shape) without sharing code -- the two repos
// are independently deployed and don't share a package. Keep this file
// and prometheusk-web's lib/onboarding/receipt.ts in sync by hand if
// the claim shape ever changes.
// ============================================================
import { createHmac, timingSafeEqual } from 'node:crypto'
import { DRIFT_PRACTICE_ID } from './prometheusk.ts'

const EXPECTED_ISSUER = 'prometheusk-web'
const EXPECTED_AUDIENCE = 'avatark-platform-web'

const ALLOWED_PRACTICE_IDS = new Set([DRIFT_PRACTICE_ID])

export interface VerifiedReceipt {
  practiceId: string
  completedAt: string
  state: string
}

export type ReceiptVerification =
  | { ok: true; receipt: VerifiedReceipt }
  | { ok: false; reason: string }

function getSecret(): string | null {
  return process.env.ONBOARDING_RECEIPT_SECRET || null
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// `expectedState` is Platform's own onboarding-state cookie value --
// the one thing that ties a given receipt back to the specific handoff
// this browser initiated, without either side needing a shared session
// or a new cross-product database table.
export function verifyReceipt(token: string, expectedState: string | null): ReceiptVerification {
  if (!expectedState) return { ok: false, reason: 'missing_state_cookie' }

  const secret = getSecret()
  if (!secret) return { ok: false, reason: 'not_configured' }

  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [payloadB64, sig] = parts
  if (!payloadB64 || !sig) return { ok: false, reason: 'malformed' }

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  if (!safeEqual(sig, expectedSig)) return { ok: false, reason: 'bad_signature' }

  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'bad_payload' }
  }

  if (claims.v !== 1) return { ok: false, reason: 'unsupported_version' }
  if (claims.iss !== EXPECTED_ISSUER) return { ok: false, reason: 'bad_issuer' }
  if (claims.aud !== EXPECTED_AUDIENCE) return { ok: false, reason: 'bad_audience' }
  if (claims.status !== 'completed') return { ok: false, reason: 'not_completed' }
  if (claims.source !== 'avatark-onboarding') return { ok: false, reason: 'bad_source' }
  if (typeof claims.practice_id !== 'string' || !ALLOWED_PRACTICE_IDS.has(claims.practice_id)) {
    return { ok: false, reason: 'unsupported_practice' }
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof claims.exp !== 'number' || claims.exp < now) return { ok: false, reason: 'expired' }
  // Small clock-skew allowance only -- a receipt claiming to be issued
  // more than a minute in the future is malformed, not just early.
  if (typeof claims.iat !== 'number' || claims.iat > now + 60) return { ok: false, reason: 'bad_iat' }

  if (typeof claims.state !== 'string' || !claims.state) return { ok: false, reason: 'missing_state' }
  if (!safeEqual(claims.state, expectedState)) return { ok: false, reason: 'state_mismatch' }

  if (typeof claims.completed_at !== 'string') return { ok: false, reason: 'bad_payload' }

  return {
    ok: true,
    receipt: { practiceId: claims.practice_id, completedAt: claims.completed_at, state: claims.state },
  }
}
