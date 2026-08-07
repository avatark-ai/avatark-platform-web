import type {
  ExperienceCorrelationId,
  ExperienceEvent,
  ExperienceEventId,
  ExperienceEventQuery,
} from "./types.ts"
import type { ExperienceEventRepository } from "./repository.ts"

interface StoredRecord {
  event: ExperienceEvent
  // Insertion order, for a stable sort when two events share a recordedAt
  // millisecond -- real clocks aren't fine-grained enough to be a total
  // order on their own under rapid writes.
  sequence: number
}

function freezeEvent(event: ExperienceEvent): ExperienceEvent {
  // Conditionally spreads `target` rather than assigning `undefined` --
  // keeps an event with no target free of a literal `target: undefined`
  // own-property, so equality checks and JSON round-trips see exactly the
  // fields that are semantically present.
  return Object.freeze({
    ...event,
    source: Object.freeze({ ...event.source }),
    actor: Object.freeze({ ...event.actor }),
    metadata: Object.freeze({ ...event.metadata }),
    ...(event.target ? { target: Object.freeze({ ...event.target }) } : {}),
  })
}

/**
 * Reference implementation only -- process-local, non-durable storage. See
 * MIGRATION_PROPOSAL.md for the real, not-yet-applied Postgres schema this
 * is meant to stand in for until that migration is reviewed and run.
 */
export class InMemoryExperienceEventRepository implements ExperienceEventRepository {
  private readonly records: StoredRecord[] = []
  private readonly ids = new Set<ExperienceEventId>()
  private sequence = 0

  async insert(event: ExperienceEvent): Promise<void> {
    if (this.ids.has(event.id)) {
      throw new Error(
        `experience event "${event.id}" already exists -- events are append-only and cannot be overwritten`,
      )
    }
    this.ids.add(event.id)
    this.records.push({ event: freezeEvent(event), sequence: this.sequence++ })
  }

  async findById(id: ExperienceEventId, userId: string): Promise<ExperienceEvent | null> {
    const record = this.records.find((r) => r.event.id === id && r.event.actor.userId === userId)
    return record ? record.event : null
  }

  async findByUser(userId: string, query: ExperienceEventQuery = {}): Promise<ExperienceEvent[]> {
    return this.query((r) => r.event.actor.userId === userId, query)
  }

  async findByCorrelationId(
    correlationId: ExperienceCorrelationId,
    userId: string,
    query: ExperienceEventQuery = {},
  ): Promise<ExperienceEvent[]> {
    return this.query(
      (r) => r.event.correlationId === correlationId && r.event.actor.userId === userId,
      query,
    )
  }

  private query(predicate: (record: StoredRecord) => boolean, query: ExperienceEventQuery): ExperienceEvent[] {
    let matches = this.records.filter(predicate)

    if (query.types?.length) {
      const wanted = new Set(query.types)
      matches = matches.filter((r) => wanted.has(r.event.type))
    }
    if (query.after !== undefined) {
      matches = matches.filter((r) => r.event.recordedAt > query.after!)
    }
    if (query.before !== undefined) {
      matches = matches.filter((r) => r.event.recordedAt < query.before!)
    }

    // Most-recent-first, tie-broken by insertion order.
    matches = [...matches].sort((a, b) => {
      if (a.event.recordedAt !== b.event.recordedAt) {
        return a.event.recordedAt < b.event.recordedAt ? 1 : -1
      }
      return b.sequence - a.sequence
    })

    if (query.limit !== undefined) matches = matches.slice(0, query.limit)

    return matches.map((r) => r.event)
  }
}
