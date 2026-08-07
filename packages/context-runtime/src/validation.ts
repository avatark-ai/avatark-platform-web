import { CONTEXT_FIELD_KEY_SET, CONTEXT_SCOPES, type ContextPatch } from './types.ts'

export class ContextValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContextValidationError'
  }
}

// Malformed input is rejected loudly, at the boundary, before it ever
// reaches the resolver — never coerced or silently dropped.
export function validateContextPatch(patch: ContextPatch): void {
  if (!patch || typeof patch !== 'object') {
    throw new ContextValidationError('Context patch must be an object')
  }
  if (typeof patch.productId !== 'string' || patch.productId.trim() === '') {
    throw new ContextValidationError('Context patch requires a non-empty productId')
  }
  if (!(CONTEXT_SCOPES as readonly string[]).includes(patch.scope)) {
    throw new ContextValidationError(`Unknown context scope "${String(patch.scope)}"`)
  }
  if (patch.occurredAt !== undefined && Number.isNaN(Date.parse(patch.occurredAt))) {
    throw new ContextValidationError(`Invalid occurredAt timestamp "${patch.occurredAt}"`)
  }
  if (!patch.fields || typeof patch.fields !== 'object' || Array.isArray(patch.fields)) {
    throw new ContextValidationError('Context patch requires a fields object')
  }

  for (const [key, value] of Object.entries(patch.fields)) {
    if (!CONTEXT_FIELD_KEY_SET.has(key)) {
      throw new ContextValidationError(`Unknown context field "${key}"`)
    }
    if (value !== null && typeof value !== 'string') {
      throw new ContextValidationError(`Context field "${key}" must be a string or null, got ${typeof value}`)
    }
    if (typeof value === 'string' && value.trim() === '') {
      throw new ContextValidationError(`Context field "${key}" must not be an empty string — use null to clear it`)
    }
  }
}
