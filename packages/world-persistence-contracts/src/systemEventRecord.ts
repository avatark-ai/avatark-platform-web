import type { WorldSystemEvent } from "@avatark/living-systems-contracts"
import type { WorldInstanceId, WorldSystemEventId } from "./ids.ts"

// Sprint 9, Phase 1/9: the durable form of WorldSystemEvent. Extends
// (never replaces) Sprint 7's WorldSystemEvent -- still explicitly NOT
// an ExperienceRegistry event (see @avatark/living-systems-contracts's
// systemEvent.ts, unchanged this sprint). Adds exactly what durability
// requires:
//
//   - eventId: an idempotency key. A network retry of the same append
//     must not duplicate a season transition or double an entity
//     lifecycle change.
//   - sequence: monotonic per-instance ordering, so "events after
//     checkpoint N" is a well-defined, gap-free query.
export interface WorldSystemEventRecord extends WorldSystemEvent {
  readonly eventId: WorldSystemEventId
  readonly worldInstanceId: WorldInstanceId
  readonly sequence: number
}

export type AppendEventResult =
  | { readonly status: "appended"; readonly sequence: number }
  | { readonly status: "duplicate_ignored"; readonly sequence: number }

export interface DurableWorldSystemEventRepository {
  // Idempotent: appending a record whose eventId was already stored
  // returns `duplicate_ignored` with the ORIGINAL sequence, and does not
  // append a second row.
  append(record: Omit<WorldSystemEventRecord, "sequence">): Promise<AppendEventResult>
  // Events with sequence > afterSequence, in ascending order. Pass 0 to
  // read full history.
  listAfter(worldInstanceId: WorldInstanceId, afterSequence: number): Promise<WorldSystemEventRecord[]>
}
