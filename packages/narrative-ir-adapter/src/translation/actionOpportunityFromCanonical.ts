import type { ArtifactReference } from "../artifactReference.ts"
import type { PersistenceIntent, ActionOpportunity } from "../actionOpportunity.ts"
import type { CanonicalAction } from "../canonicalNarrativeIR.ts"

export interface CanonicalActionOpportunityContext {
  subjectId: string
  contextId: string
  openedAtTick: number
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}

// Constructs an ActionOpportunity from a canonical Action(kind: NON_ACTION)
// document (schemas/ir/v0/action.schema.json) plus the canonical Action(kind:
// ACTION) document that would disqualify it -- sourcing NON_ACTION semantics
// from canonical Action rather than STK-SPEC-007's Rule/Event.kind=NON_ACTION
// assumption, per NC-IR-RECONCILE-01's Action/NonAction mapping.
//
// Neither Action document carries subject/context/tick fields on the
// canonical schema itself (Action is narrower than STK-SPEC-007's unified
// Event shape, by design) -- those remain host-supplied framing, exactly as
// before this migration; only the *source* of the action's own identity and
// verb changes. `deriveNonActionQualification()` itself is not modified by
// this translation -- it continues to consume the identical ActionOpportunity
// shape it always has.
export function actionOpportunityFromCanonicalAction(
  nonAction: CanonicalAction,
  qualifyingAction: CanonicalAction,
  ctx: CanonicalActionOpportunityContext,
): ActionOpportunity {
  if (nonAction.kind !== "NON_ACTION") {
    throw new Error(`actionOpportunityFromCanonicalAction: expected nonAction.kind NON_ACTION, got ${nonAction.kind}`)
  }
  if (qualifyingAction.kind !== "ACTION") {
    throw new Error(`actionOpportunityFromCanonicalAction: expected qualifyingAction.kind ACTION, got ${qualifyingAction.kind}`)
  }

  return {
    id: `opportunity-${nonAction.id}`,
    subjectId: ctx.subjectId,
    contextId: ctx.contextId,
    qualifyingActionRef: qualifyingAction.id,
    openedAtTick: ctx.openedAtTick,
    ruleId: ctx.artifactReference.ruleId,
    artifactReference: ctx.artifactReference,
    persistenceIntent: ctx.persistenceIntent,
  }
}
