import type {
  ExperienceCorrelationId,
  ExperienceEvent,
  ExperienceEventId,
  ExperienceEventQuery,
} from "./types.ts"

/**
 * Storage contract for ExperienceEvent. Every method is user-scoped by a
 * required `userId` -- there is no "read any user's events" method here on
 * purpose (see the package README's Privacy/Security section). An
 * administrative repository, if one is ever needed, must be a separate,
 * separately-privileged type -- never a relaxation of this one.
 *
 * Append-only: note there is no update() or delete(). Immutability is
 * enforced by this interface simply not offering a way to mutate a stored
 * event, not by a runtime check.
 */
export interface ExperienceEventRepository {
  insert(event: ExperienceEvent): Promise<void>
  findById(id: ExperienceEventId, userId: string): Promise<ExperienceEvent | null>
  findByUser(userId: string, query?: ExperienceEventQuery): Promise<ExperienceEvent[]>
  findByCorrelationId(
    correlationId: ExperienceCorrelationId,
    userId: string,
    query?: ExperienceEventQuery,
  ): Promise<ExperienceEvent[]>
}
