import type { UserId } from "./ids.ts"

export interface History<TEntry> {
  subjectId: UserId
  entries: TEntry[]
}
