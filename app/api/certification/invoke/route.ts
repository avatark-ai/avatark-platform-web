import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleCertificationInvocation } from '@/lib/certificationAuthority/service'

// PLT-ADR-015 §3: the Certification Authority's trusted server-side
// invocation boundary. POST { subjectKind, subjectArtifact, invocationContext? }.
// The invoker is the server-verified Supabase session user -- never a body
// field. The grant check, evaluator run, signing and durable commit all
// happen server-side in lib/certificationAuthority. This route does not
// publish, promote, or authorize anything beyond issuing a Certification
// Record, and it is not yet wired to StudioK's Certify step
// (DEPLOYMENT_TOPOLOGY_DEFERRED).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json().catch(() => undefined)
  const response = await handleCertificationInvocation(user?.id ?? null, body, { admin: createAdminClient() })
  return NextResponse.json(response.body, { status: response.status })
}
