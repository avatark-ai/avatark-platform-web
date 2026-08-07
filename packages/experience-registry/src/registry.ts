import {
  CURRENT_EXPERIENCE_SCHEMA_VERSION,
  type ExperienceCorrelationId,
  type ExperienceEvent,
  type ExperienceEventId,
  type ExperienceEventInput,
  type ExperienceEventQuery,
  type ExperienceType,
} from "./types.ts"
import { assertValidEventInput } from "./validation.ts"
import type { ExperienceEventRepository } from "./repository.ts"

// Module-local ambient shape (not `declare global`) -- avoids requiring the
// "dom" lib in this package's own tsconfig just for the one global this
// file touches. Satisfied at runtime by both browsers and Node 19+.
declare const crypto: { randomUUID(): string }

export interface ExperienceRegistryDeps {
  /** Injectable for deterministic tests -- defaults to `() => new Date().toISOString()`. */
  now?: () => string
  /** Injectable for deterministic tests -- defaults to the platform's `crypto.randomUUID()`. */
  generateId?: () => string
}

/**
 * The one way producers write to, and consumers read from, the experience
 * event log. Wraps an ExperienceEventRepository -- this class owns
 * validation and stamping (id/schemaVersion/recordedAt); the repository
 * owns storage and query mechanics.
 */
export class ExperienceRegistry {
  private readonly repository: ExperienceEventRepository
  private readonly now: () => string
  private readonly generateId: () => string

  constructor(repository: ExperienceEventRepository, deps: ExperienceRegistryDeps = {}) {
    this.repository = repository
    this.now = deps.now ?? (() => new Date().toISOString())
    this.generateId = deps.generateId ?? (() => crypto.randomUUID())
  }

  /** Validates, stamps, and durably appends one event. Throws ExperienceValidationError on malformed input. */
  async recordEvent(input: ExperienceEventInput): Promise<ExperienceEvent> {
    assertValidEventInput(input)

    const recordedAt = this.now()
    // Frozen here, at the API boundary -- immutability is this class's
    // guarantee to callers, not an implementation detail a given
    // repository happens to provide. Optional fields are conditionally
    // spread rather than assigned `undefined`, so an event with no target/
    // correlationId/sessionId is free of literal-undefined own-properties.
    const event: ExperienceEvent = Object.freeze({
      id: this.generateId(),
      schemaVersion: CURRENT_EXPERIENCE_SCHEMA_VERSION,
      type: input.type,
      source: Object.freeze({ ...input.source }),
      actor: Object.freeze({ ...input.actor }),
      metadata: Object.freeze({ ...(input.metadata ?? {}) }),
      occurredAt: input.occurredAt ?? recordedAt,
      recordedAt,
      ...(input.target ? { target: Object.freeze({ ...input.target }) } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    })

    await this.repository.insert(event)
    return event
  }

  /** Returns null both when the event doesn't exist and when it belongs to a different user -- the two are indistinguishable to a caller by design. */
  async getEvent(id: ExperienceEventId, userId: string): Promise<ExperienceEvent | null> {
    return this.repository.findById(id, userId)
  }

  async listEvents(userId: string, query?: ExperienceEventQuery): Promise<ExperienceEvent[]> {
    return this.repository.findByUser(userId, query)
  }

  async listRecentEvents(userId: string, limit = 20): Promise<ExperienceEvent[]> {
    return this.repository.findByUser(userId, { limit })
  }

  async listEventsByType(
    userId: string,
    type: ExperienceType,
    query?: Omit<ExperienceEventQuery, "types">,
  ): Promise<ExperienceEvent[]> {
    return this.repository.findByUser(userId, { ...query, types: [type] })
  }

  async listEventsByCorrelation(
    correlationId: ExperienceCorrelationId,
    userId: string,
    query?: ExperienceEventQuery,
  ): Promise<ExperienceEvent[]> {
    return this.repository.findByCorrelationId(correlationId, userId, query)
  }

  /** Sugar over listEvents() for UI-facing chronological feeds -- same data, name states intent at the call site. */
  async listTimeline(userId: string, query?: ExperienceEventQuery): Promise<ExperienceEvent[]> {
    return this.repository.findByUser(userId, query)
  }
}
