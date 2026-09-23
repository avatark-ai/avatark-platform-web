// Resolves the visitor from the server-verified AvatarK session ONLY.
// Never reads subjectId/avatarKId/anon from the query string or body.
// Fails closed: if the session cannot be verified (including identity not
// being configured in this environment), the visitor is unauthenticated.
import { supabaseIdentityProvider } from '@/lib/identity/supabaseIdentityProvider'
import type { VerifiedVisitor } from './service.ts'

export async function resolveVisitorFromSession(): Promise<VerifiedVisitor | null> {
  try {
    const claims = await supabaseIdentityProvider.verifySession()
    return claims ? { subjectId: claims.subjectId } : null
  } catch {
    return null
  }
}
