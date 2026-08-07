import type { Timestamp, UserId } from "./ids.ts"

// The common subset of JourneyState/WorldState/NarrativeState -- a base
// shape documenting a minimum, not a replacement for any of the three.
// None of them needs to extend this today.
export interface State<TStatus extends string = string> {
  subjectId: UserId
  status: TStatus
  updatedAt: Timestamp
}
