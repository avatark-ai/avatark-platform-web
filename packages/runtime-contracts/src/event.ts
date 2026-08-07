import type { ProductId, Timestamp, UserId } from "./ids.ts"

// The rich shape -- modeled on experience-registry's ExperienceEvent, the
// only one of the five branches with a typed source/actor/target/metadata
// and real validation. Transition and Event are deliberately not collapsed
// into one contract -- see docs/RUNTIME_GLOSSARY.md.
export type EventMetadataValue = string | number | boolean | null

export interface Event<
  TType extends string = string,
  TMetadata = Record<string, EventMetadataValue>,
> {
  id: string
  schemaVersion: number
  type: TType
  source: { productId: ProductId; component?: string }
  actor: { userId: UserId; role?: "user" | "system" | "admin" }
  target?: { type: string; id: string }
  metadata: TMetadata
  occurredAt: Timestamp
  recordedAt: Timestamp
  correlationId?: string
  sessionId?: string
}
