// Sprint 10, Phase 2: capabilities describe behavioral AFFORDANCES, not
// renderer appearance -- an archetype's capability list is the entire
// contract between "what kind of entity is this" and "what behaviors
// are even eligible for it." No capability here implies or requires any
// specific presentation; that translation happens only in the
// embodiment layer (Sprint 8/10 bridge), never here.
export type EntityCapability = "can_move" | "can_graze" | "can_drink" | "can_rest" | "can_group" | "can_forage" | "can_flock"
