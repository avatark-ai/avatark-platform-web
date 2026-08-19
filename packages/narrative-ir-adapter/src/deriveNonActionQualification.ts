import type { ActionOpportunity } from "./actionOpportunity.ts"
import type { NonActionQualification } from "./nonActionQualification.ts"

// Mirrors the canonical producer's own causal-attribution registers
// (CONSUMER/AUTONOMOUS/ENVIRONMENTAL/UNSPECIFIED) verbatim -- reproduced,
// not reinvented, so downstream attribution is never rewritten by this
// package (see the "causal attribution" invariant below).
export type EvidenceActor = "CONSUMER" | "AUTONOMOUS" | "ENVIRONMENTAL" | "UNSPECIFIED"

// One observed occurrence in the bounded evidence window. `actionRef` is set
// only when this event constitutes the subject performing an action; it is
// compared against the opportunity's own `qualifyingActionRef`, never
// inferred from the event's mere presence.
export interface ObservedEvent {
  id: string
  subjectId: string
  actor: EvidenceActor
  tick: number
  actionRef?: string
}

export type EvidenceCompleteness = "COMPLETE" | "INCOMPLETE"

// `INCOMPLETE` means the window itself is untrustworthy -- e.g. a
// disconnect or missing telemetry gap -- and must never be treated as
// equivalent to a complete window that happens to contain no qualifying
// action.
export interface EvidenceWindow {
  completeness: EvidenceCompleteness
  events: readonly ObservedEvent[]
}

export type DerivationResult =
  | { status: "QUALIFIED"; qualification: NonActionQualification }
  | { status: "NOT_QUALIFIED"; reason: string }
  | { status: "INCOMPLETE_EVIDENCE"; reason: string }

// Pure, deterministic: no hidden state, no IO, no wall clock, no random
// identifiers. Same (opportunity, terminalTick, evidence) always yields the
// same result.
export function deriveNonActionQualification(
  opportunity: ActionOpportunity,
  terminalTick: number,
  evidence: EvidenceWindow,
): DerivationResult {
  if (evidence.completeness === "INCOMPLETE") {
    return {
      status: "INCOMPLETE_EVIDENCE",
      reason: "evidence window is incomplete or disconnected -- cannot establish qualification",
    }
  }

  if (terminalTick < opportunity.openedAtTick) {
    return {
      status: "NOT_QUALIFIED",
      reason: "terminal tick precedes the opportunity's own open tick",
    }
  }

  // Only the opportunity's own subject performing the specific qualifying
  // action can disqualify -- AUTONOMOUS/ENVIRONMENTAL/UNSPECIFIED events, and
  // CONSUMER events from any other subject, never do, regardless of how many
  // occur in the window (world activity is independent of this subject's
  // opportunity).
  const withinWindow = evidence.events.filter(e => e.tick >= opportunity.openedAtTick && e.tick <= terminalTick)

  const qualifyingActionEvents = withinWindow.filter(
    e => e.subjectId === opportunity.subjectId && e.actor === "CONSUMER" && e.actionRef === opportunity.qualifyingActionRef,
  )

  if (qualifyingActionEvents.length > 0) {
    return {
      status: "NOT_QUALIFIED",
      reason: "the qualifying action occurred before the terminal boundary",
    }
  }

  const qualification: NonActionQualification = {
    opportunityId: opportunity.id,
    subjectId: opportunity.subjectId,
    contextId: opportunity.contextId,
    qualifiedAtTick: terminalTick,
    evidence: {
      openedAtTick: opportunity.openedAtTick,
      closedAtTick: terminalTick,
      disqualifyingEventIds: [],
    },
    artifactReference: opportunity.artifactReference,
    persistenceIntent: opportunity.persistenceIntent,
  }

  return { status: "QUALIFIED", qualification }
}
