import type { ContextAdapter } from './adapter.ts'
import { ContextResolver } from './resolver.ts'
import type { ContextRepository } from './repository.ts'
import {
  CONTEXT_FIELD_KEYS,
  type ContextFieldKey,
  type ContextFields,
  type ContextHistoryEntry,
  type ContextPatch,
  type ContextPatchOutcome,
  type ContextRejection,
  type ContextSnapshot,
  type ContextSource,
} from './types.ts'
import { validateContextPatch } from './validation.ts'

function emptyFields(): ContextFields {
  const fields = {} as ContextFields
  for (const key of CONTEXT_FIELD_KEYS) {
    fields[key] = { value: null, source: null }
  }
  return fields
}

function emptySnapshot(userId: string): ContextSnapshot {
  return { userId, fields: emptyFields(), updatedAt: null }
}

function cloneSnapshot(snapshot: ContextSnapshot): ContextSnapshot {
  return {
    userId: snapshot.userId,
    updatedAt: snapshot.updatedAt,
    fields: { ...snapshot.fields },
  }
}

let historySequence = 0
function nextHistoryId(userId: string): string {
  historySequence += 1
  return `${userId}:${Date.now()}:${historySequence}`
}

export interface SetContextOptions {
  productId: string
  occurredAt?: string
  reason?: string
}

// The eight runtime operations from the mission brief, all user-scoped.
// This class holds no user identity/authorization logic of its own — a
// host is responsible for resolving "which userId is this request
// allowed to act as" before calling in (see the /api/account/context
// route for where that boundary actually lives).
export class ContextRuntime {
  private repository: ContextRepository
  private resolver: ContextResolver
  private adapters: ContextAdapter[]

  constructor(
    repository: ContextRepository,
    options?: { resolver?: ContextResolver; adapters?: ContextAdapter[] },
  ) {
    this.repository = repository
    this.resolver = options?.resolver ?? new ContextResolver()
    this.adapters = options?.adapters ?? []
  }

  async getContext(userId: string): Promise<ContextSnapshot> {
    const persisted = await this.repository.loadSnapshot(userId)
    const snapshot = persisted ? cloneSnapshot(persisted) : emptySnapshot(userId)

    const currentProductId = snapshot.fields.currentProductId.value
    const adapter = currentProductId ? this.adapters.find((a) => a.productId === currentProductId) : undefined
    if (!adapter) return snapshot

    const defaults = await adapter.getDefaults(userId)
    for (const [key, value] of Object.entries(defaults) as [ContextFieldKey, string | null][]) {
      if (snapshot.fields[key].source !== null) continue // never override a real value with a default
      snapshot.fields[key] = {
        value,
        source: { scope: 'product_default', productId: adapter.productId, writtenAt: snapshot.updatedAt ?? new Date(0).toISOString() },
      }
    }
    return snapshot
  }

  // The general-purpose write primitive: applies an arbitrary patch at
  // whatever scope the caller specifies, running every field through the
  // precedence/staleness resolver. setContext(), clearContextField(),
  // clearContext(), and restoreContext() are all built on this.
  async patchContext(userId: string, patch: ContextPatch): Promise<ContextPatchOutcome> {
    validateContextPatch(patch)

    const persisted = await this.repository.loadSnapshot(userId)
    const snapshot = persisted ? cloneSnapshot(persisted) : emptySnapshot(userId)
    const writtenAt = patch.occurredAt ?? new Date().toISOString()
    const source: ContextSource = { scope: patch.scope, productId: patch.productId, writtenAt, reason: patch.reason }

    const applied: ContextFieldKey[] = []
    const rejected: ContextRejection[] = []

    for (const [key, value] of Object.entries(patch.fields) as [ContextFieldKey, string | null][]) {
      const outcome = this.resolver.resolveField({
        field: key,
        existing: snapshot.fields[key],
        incomingValue: value,
        incomingSource: source,
      })
      if (outcome.applied) {
        snapshot.fields[key] = outcome.result
        applied.push(key)
      } else {
        rejected.push(outcome.rejection)
      }
    }

    if (applied.length > 0) {
      snapshot.updatedAt = writtenAt
      await this.repository.saveSnapshot(userId, snapshot)
      await this.repository.appendHistory({
        id: nextHistoryId(userId),
        userId,
        snapshot: cloneSnapshot(snapshot),
        patch,
        recordedAt: new Date().toISOString(),
      })
    }

    return { snapshot, applied, rejected }
  }

  // Convenience wrapper representing "the active session says these
  // fields are true now" — always the highest precedence tier.
  async setContext(
    userId: string,
    fields: Partial<Record<ContextFieldKey, string | null>>,
    options: SetContextOptions,
  ): Promise<ContextPatchOutcome> {
    return this.patchContext(userId, {
      productId: options.productId,
      scope: 'session',
      fields,
      occurredAt: options.occurredAt,
      reason: options.reason,
    })
  }

  async clearContextField(
    userId: string,
    field: ContextFieldKey,
    options: SetContextOptions & { scope?: ContextPatch['scope'] },
  ): Promise<ContextPatchOutcome> {
    return this.patchContext(userId, {
      productId: options.productId,
      scope: options.scope ?? 'session',
      fields: { [field]: null },
      occurredAt: options.occurredAt,
      reason: options.reason ?? 'clearContextField',
    })
  }

  async clearContext(
    userId: string,
    options: SetContextOptions & { scope?: ContextPatch['scope'] },
  ): Promise<ContextPatchOutcome> {
    const fields = Object.fromEntries(CONTEXT_FIELD_KEYS.map((key) => [key, null])) as Partial<
      Record<ContextFieldKey, string | null>
    >
    return this.patchContext(userId, {
      productId: options.productId,
      scope: options.scope ?? 'session',
      fields,
      occurredAt: options.occurredAt,
      reason: options.reason ?? 'clearContext',
    })
  }

  // Explicitly snapshots the *current resolved* context into history
  // without changing it — e.g. before a risky transition, so the caller
  // has something concrete to restoreContext() back to.
  async pushContext(userId: string): Promise<ContextHistoryEntry> {
    const snapshot = await this.getContext(userId)
    const entry: ContextHistoryEntry = {
      id: nextHistoryId(userId),
      userId,
      snapshot,
      patch: null,
      recordedAt: new Date().toISOString(),
    }
    await this.repository.appendHistory(entry)
    return entry
  }

  // Restoring is itself an explicit, present-moment session action — it
  // re-applies the historical snapshot's field values now, at 'session'
  // scope, so it always wins and is never rejected as stale.
  async restoreContext(userId: string, entryId: string, options: SetContextOptions): Promise<ContextPatchOutcome> {
    const entry = await this.repository.loadHistoryEntry(userId, entryId)
    if (!entry) {
      throw new Error(`No context history entry "${entryId}" for this user`)
    }
    const fields = Object.fromEntries(
      CONTEXT_FIELD_KEYS.map((key) => [key, entry.snapshot.fields[key].value]),
    ) as Partial<Record<ContextFieldKey, string | null>>

    return this.patchContext(userId, {
      productId: options.productId,
      scope: 'session',
      fields,
      occurredAt: options.occurredAt,
      reason: options.reason ?? `restoreContext:${entryId}`,
    })
  }

  async getContextHistory(userId: string, limit = 20): Promise<ContextHistoryEntry[]> {
    return this.repository.loadHistory(userId, limit)
  }
}
