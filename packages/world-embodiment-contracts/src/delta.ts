export type EmbodimentDeltaOp = "ADD" | "UPDATE" | "REMOVE" | "UNCHANGED"

// Sprint 8, Phase 13: a renderer-neutral reconciliation entry. `path`
// names a stable, addressable element (e.g. "region:yamuna.environment",
// "entity:riverbank-vegetation-1") so a renderer can patch only what
// changed rather than rebuilding the world every tick. `before`/`after`
// are opaque payloads (whatever presentation object that path resolves
// to) -- this contract doesn't know or care what shape they are, only
// that they're the same shape on both sides of one entry.
export interface EmbodimentDeltaEntry {
  path: string
  op: EmbodimentDeltaOp
  before?: unknown
  after?: unknown
}

export interface WorldEmbodimentDelta {
  worldId: string
  fromTick: number
  toTick: number
  entries: EmbodimentDeltaEntry[]
}
