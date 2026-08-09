// Sprint 15, mission's own "ADAPTATION MODEL"/"WHAT MAY ADAPT" sections:
// a closed, small taxonomy of WHO an adaptation is about -- never a
// free-form string. Every signal/pressure/rule/decision/effect in this
// package is keyed by exactly one of these plus a subjectId (an
// existing EntityId/RelationshipId/LocationId/GroupId/EncounterRuleId
// string, never a new identity space).
export type AdaptationDomain = "ENTITY" | "RELATIONSHIP" | "PLACE" | "GROUP" | "WORLD_POSSIBILITY"
