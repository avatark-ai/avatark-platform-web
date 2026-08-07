import {
  CONTEXT_SCOPES,
  type ContextFieldKey,
  type ContextFieldValue,
  type ContextRejection,
  type ContextScope,
  type ContextSource,
} from './types.ts'

// Index 0 = highest precedence. Mirrors the mission's stated order:
// explicit active session > persisted user context > product default > empty.
const SCOPE_RANK: Record<ContextScope, number> = Object.fromEntries(
  CONTEXT_SCOPES.map((scope, index) => [scope, index]),
) as Record<ContextScope, number>

export interface ResolveFieldInput {
  field: ContextFieldKey
  existing: ContextFieldValue | undefined
  incomingValue: string | null
  incomingSource: ContextSource
}

export type ResolveFieldResult =
  | { applied: true; result: ContextFieldValue }
  | { applied: false; rejection: ContextRejection }

// The one place precedence and staleness are decided. Deliberately pure
// and stateless — the runtime is the only caller, and tests exercise this
// directly for exhaustive precedence/staleness coverage without needing a
// repository.
export class ContextResolver {
  resolveField(input: ResolveFieldInput): ResolveFieldResult {
    const { field, existing, incomingValue, incomingSource } = input
    const nextFieldValue: ContextFieldValue = { value: incomingValue, source: incomingSource }

    // Nothing to conflict with yet — the incoming write always wins.
    if (!existing || !existing.source) {
      return { applied: true, result: nextFieldValue }
    }

    const existingRank = SCOPE_RANK[existing.source.scope]
    const incomingRank = SCOPE_RANK[incomingSource.scope]

    // A higher-precedence write always overrides a lower one, regardless
    // of timestamps — an explicit active session outranks a stale
    // persisted value even if the persisted value is "newer" on paper.
    if (incomingRank < existingRank) {
      return { applied: true, result: nextFieldValue }
    }

    // A lower-precedence write can never override a higher-precedence
    // one that's already in place.
    if (incomingRank > existingRank) {
      return {
        applied: false,
        rejection: { field, reason: 'lower_precedence', attemptedValue: incomingValue },
      }
    }

    // Same scope: newer wins, but an older write is rejected as stale —
    // never silently applied over a fresher value.
    const existingTime = Date.parse(existing.source.writtenAt)
    const incomingTime = Date.parse(incomingSource.writtenAt)
    if (incomingTime < existingTime) {
      return {
        applied: false,
        rejection: { field, reason: 'stale', attemptedValue: incomingValue },
      }
    }

    return { applied: true, result: nextFieldValue }
  }
}
