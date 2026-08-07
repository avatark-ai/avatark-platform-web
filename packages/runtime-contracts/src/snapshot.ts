import type { Timestamp, UserId } from "./ids.ts"

// A full point-in-time read of a subject's fields -- modeled on
// context-runtime's ContextSnapshot, which deliberately does not call
// itself "State" (see docs/RUNTIME_GLOSSARY.md).
export interface Snapshot<TFields> {
  subjectId: UserId
  fields: TFields
  updatedAt: Timestamp | null
}
