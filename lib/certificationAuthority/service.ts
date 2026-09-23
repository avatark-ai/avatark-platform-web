// Server-only. The trusted server-side Certification Authority boundary
// (PLT-ADR-015 §3) as hosted by avatark-platform-web -- the platform that
// owns the evaluators (PLT-ADR-009 §2). The invoker identity is taken ONLY
// from the verified Supabase session (the route handler's auth.getUser()),
// never from the request body. Deployment topology remains
// DEPLOYMENT_TOPOLOGY_DEFERRED: nothing here is deployed or connected to
// StudioK's Certify step.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createCertificationAuthority, type InvokeCertificationResult } from '@avatark/certification-authority'
import { createCapabilityGrantSource } from './grantSource.ts'
import { loadCertificationKeyConfig } from './keyConfig.ts'
import { createSupabaseCertificationRefusalAudit, createSupabaseCertificationRegistry } from './supabaseRegistry.ts'

export interface CertificationInvocationResponse {
  status: number
  body: Record<string, unknown>
}

const REQUEST_KEYS = ['subjectKind', 'subjectArtifact', 'invocationContext']

function statusForRefusal(category: string): number {
  if (category === 'UNAUTHENTICATED_INVOKER') return 401
  if (category === 'GRANT_DENIED' || category === 'SELF_ASSIGNED_GRANT') return 403
  if (category === 'ISSUANCE_NOT_DURABLE' || category === 'INTERNAL_ERROR') return 503
  return 422
}

export function toInvocationResponse(result: InvokeCertificationResult): CertificationInvocationResponse {
  if (result.outcome === 'ISSUED') {
    return { status: 201, body: { outcome: 'ISSUED', certificationRecord: result.attested, certifiedArtifact: result.artifact } }
  }
  return {
    status: statusForRefusal(result.category),
    body: { outcome: 'REFUSED', attemptId: result.attemptId, category: result.category, detail: result.detail, auditPersisted: result.auditPersisted },
  }
}

export interface CertificationServiceDeps {
  admin: SupabaseClient | null
  env?: Record<string, string | undefined>
}

/** `sessionUserId` must come from a server-verified session (supabase.auth.getUser()). */
export async function handleCertificationInvocation(
  sessionUserId: string | null,
  body: unknown,
  deps: CertificationServiceDeps,
): Promise<CertificationInvocationResponse> {
  if (!deps.admin) {
    return { status: 503, body: { outcome: 'UNAVAILABLE', detail: 'certification registry is not configured (SUPABASE_SERVICE_ROLE_KEY)' } }
  }
  const keys = loadCertificationKeyConfig(deps.env)
  if (keys.status !== 'CONFIGURED') {
    return { status: 503, body: { outcome: 'UNAVAILABLE', detail: 'certification signing key is not configured' } }
  }
  const authority = createCertificationAuthority({
    grants: createCapabilityGrantSource(deps.admin),
    registry: createSupabaseCertificationRegistry(deps.admin),
    refusalAudit: createSupabaseCertificationRefusalAudit(deps.admin),
    signer: keys.signer,
    trust: keys.trust,
  })

  const request = body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  const unexpected = request ? Object.keys(request).filter((k) => !REQUEST_KEYS.includes(k)) : []
  const result = await authority.invokeCertification({
    authenticatedInvoker: sessionUserId ? { kind: 'HUMAN', userId: sessionUserId, authenticationMethod: 'SUPABASE_SESSION' } : null,
    subjectKind: request?.subjectKind,
    // An unexpected top-level key (e.g. a caller-asserted invoker, grant or
    // record) is folded into the subject so the Authority refuses and audits it.
    subjectArtifact: unexpected.length > 0 ? { ...(request?.subjectArtifact as object), __unexpectedRequestFields: unexpected } : request?.subjectArtifact,
    invocationContext: request?.invocationContext,
  })
  return toInvocationResponse(result)
}
