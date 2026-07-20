// Writes a real row to platform_audit_events for a sensitive admin action.
// Uses the service-role admin client (the only writer -- see migration
// 015's grants). Best-effort: a logging failure must never break the
// admin action it's describing, so errors are swallowed after being
// surfaced to the server console.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditEventInput {
  actorId: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  result: 'success' | 'failure'
}

export function currentAuditEnvironment(env: Record<string, string | undefined> = process.env): string {
  return env.VERCEL_ENV ?? 'local'
}

export async function recordAuditEvent(admin: SupabaseClient, event: AuditEventInput): Promise<void> {
  const { error } = await admin.from('platform_audit_events').insert({
    actor_id: event.actorId,
    action: event.action,
    target_type: event.targetType ?? null,
    target_id: event.targetId ?? null,
    metadata: event.metadata ?? {},
    environment: currentAuditEnvironment(),
    result: event.result,
  })
  if (error) {
    console.error('[audit] failed to record event', event.action, error.message)
  }
}
