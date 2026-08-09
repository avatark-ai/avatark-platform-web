import type { CanonicalEventDefinition } from "@avatark/canonical-event-contracts"
import { deriveDefinitionContentHash } from "@avatark/canonical-event-runtime"

// Sprint 18: world-specific canonical-event configuration -- a
// Host-layer, non-canonical, systems-config judgment call, the same
// category of decision Sprint 10/11/13/15/16's own
// vrindavanXDefinition.ts files already make. `CanonicalEventDefinition[]`
// is otherwise fully generic and never branches on any of these ids
// (see packages/canonical-event-runtime's own
// livingForestCanonicalEventPortability.test.ts for the same engine
// running a wholly different canonical event).
//
// Honest scope note (see docs/SPRINT18_FINAL_REPORT.md, reconciliation
// findings): no real StudioK `*.canonical-events.json` artifact has
// been produced yet (Phase 0's own STOP gate #5), so this ONE canonical
// event is Host-authored -- a real, already-Approved-Canon-grounded
// scenario (Krishna lifting Govardhan Hill, a genuinely named Vrindavan
// narrative moment, per the prep document's own reconciled §12
// scenario), never invented mythology. Its `definitionContentHash` is
// computed from the definition's own stable content fields
// (`deriveDefinitionContentHash`), a documented, honest substitute for
// a real vendored-artifact checksum until one exists.
//
// A SECOND reconciliation finding, against the REAL Sprint 10 grammar
// (not merely the prep document's own assumption): no entity in the
// current Vrindavan population rhythm grammar
// (`COW_RHYTHM_SCHEDULE`/`BIRD_FLOCK_RHYTHM_SCHEDULE`) ever routes to
// `govardhan-path` -- it is seeded, addressable, and spatially real
// (`patch-govardhan-path`), but organically UNREACHABLE by this
// sprint's own population grammar. Forcing reachability would mean
// modifying Sprint 10's own rhythm schedules, out of scope. This
// canonical event's own ACTIVATION CONDITION is therefore
// `WORLD_TIME_AT_LEAST` (a monotonically-reachable, non-emergent fact,
// exactly Phase 0 §9's own REQUIRED-event recommendation) rather than
// `LOCATION_REACHED` -- a legitimate authored shape in its own right
// (Govardhan Puja is itself a seasonal/calendrical observance, not
// contingent on any single entity's own foot traffic). Its MANDATED
// FACT and SCOPE remain anchored at `govardhan-path`/`patch-govardhan-path`
// exactly as the prep document's own §12 scenario describes -- only the
// eligibility trigger differs from that document's original sketch.
const GOVARDHAN_LIFTING_ID = "canonical-event-govardhan-lifting"
const GOVARDHAN_LIFTING_CONDITIONS: CanonicalEventDefinition["activationConditions"] = [{ kind: "WORLD_TIME_AT_LEAST", tick: 1 }]
const GOVARDHAN_LIFTING_FACTS: CanonicalEventDefinition["mandatedFacts"] = [{ kind: "LOCATION_ACTIVE", locationId: "govardhan-path" }]
const GOVARDHAN_LIFTING_SCOPE: CanonicalEventDefinition["scope"] = { level: "PATCH", patchId: "patch-govardhan-path" }
const GOVARDHAN_LIFTING_HASH = deriveDefinitionContentHash(GOVARDHAN_LIFTING_ID, GOVARDHAN_LIFTING_CONDITIONS, GOVARDHAN_LIFTING_FACTS, GOVARDHAN_LIFTING_SCOPE)

export const VRINDAVAN_CANONICAL_EVENTS: CanonicalEventDefinition[] = [
  {
    identity: { canonicalEventId: GOVARDHAN_LIFTING_ID, definitionContentHash: GOVARDHAN_LIFTING_HASH },
    // REQUIRED: this world instance's own authored activation window
    // (tick >= 1) is a monotonically-reachable, non-emergent fact
    // (Phase 0 §9's own required restriction), so it cannot be starved
    // by any emergent condition.
    category: "REQUIRED",
    activationConditions: GOVARDHAN_LIFTING_CONDITIONS,
    mandatedFacts: GOVARDHAN_LIFTING_FACTS,
    scope: GOVARDHAN_LIFTING_SCOPE,
    provenance: { canonDocIds: [], specId: "sprint-18-host-authored-pending-studiok-artifact", specVersion: 1, definitionContentHash: GOVARDHAN_LIFTING_HASH },
  },
]
