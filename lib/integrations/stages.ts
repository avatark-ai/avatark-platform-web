import { JOURNEY_STEP_ORDER, canTransition, type JourneyStepId } from "../journey/stateMachine.ts";
import type { JourneyManifest } from "../journey/manifest.ts";
import {
  buildEchoToStreamKHandoff,
  buildStreamKToPrometheusHandoff,
  buildPrometheusToLivingEchoHandoff,
  buildLivingEchoToArenaHandoff,
  type LivingEchoToArenaRecommendationReason,
} from "../journey/handoffContracts.ts";
import { streamkAdapter } from "./streamkAdapter.ts";
import { prometheusAdapter } from "./prometheusAdapter.ts";
import { livingEchoAdapter } from "./livingEchoAdapter.ts";
import { arenaAdapter } from "./arenaAdapter.ts";
import type { AdapterDescribeResult } from "./adapterTypes.ts";

// ============================================================
// Grounded in docs/STATE_MACHINE.md's transition table: watch_first's
// only legal next step is practice_intro (never straight to
// practice_runtime), so practice_intro is always visited and the real
// StreamKToPrometheusHandoff crossing always happens at exactly
// practice_intro -> practice_runtime, whether or not Watch First was
// visited first. That's the anchor that makes this 5-stage grouping
// consistent with docs/HANDOFF_CONTRACTS.md's own description of each
// edge -- a new, additive lookup only; lib/journey/stateMachine.ts
// itself is untouched.
export type IntegrationProduct = "AvatarK" | "StreamK" | "Prometheus" | "Living Echo" | "Arena";

export const INTEGRATION_STAGE_ORDER: IntegrationProduct[] = [
  "AvatarK",
  "StreamK",
  "Prometheus",
  "Living Echo",
  "Arena",
];

const STEP_PRODUCT: Record<JourneyStepId, IntegrationProduct> = {
  invitation_received: "AvatarK",
  invitation_accepted: "AvatarK",
  watch_first: "StreamK",
  practice_intro: "AvatarK",
  practice_runtime: "Prometheus",
  reflection: "Prometheus",
  living_echo: "Living Echo",
  recommendation: "Living Echo",
  arena: "Arena",
};

export function productForStep(step: JourneyStepId): IntegrationProduct {
  return STEP_PRODUCT[step];
}

/** Every legal next step from `step`, per lib/journey/stateMachine.ts's own graph -- derived, never a second copy of the transition table. */
export function legalNextSteps(step: JourneyStepId): JourneyStepId[] {
  return JOURNEY_STEP_ORDER.filter((candidate) => canTransition(step, candidate));
}

export interface HandoffExtras {
  completedAt?: string;
  recommendationReason?: LivingEchoToArenaRecommendationReason;
}

export interface BoundaryCrossing {
  toProduct: IntegrationProduct;
  buildHandoff: (manifest: JourneyManifest, extras?: HandoffExtras) => unknown;
  describeWithAdapter: (handoff: unknown) => AdapterDescribeResult;
  adapterDisplayName: string;
}

type StepPair = `${JourneyStepId}->${JourneyStepId}`;

// The 4 JourneyStepId transitions that cross a real product boundary --
// every other legal transition stays within one product/stage. Each
// entry wires straight to the existing, frozen handoffContracts.ts
// builder and this sprint's matching adapter; no new handoff shape.
const BOUNDARY_CROSSINGS: Partial<Record<StepPair, BoundaryCrossing>> = {
  "invitation_accepted->watch_first": {
    toProduct: "StreamK",
    buildHandoff: (manifest) => buildEchoToStreamKHandoff(manifest),
    describeWithAdapter: (handoff) =>
      streamkAdapter.describeHandoff(handoff as Parameters<typeof streamkAdapter.describeHandoff>[0]),
    adapterDisplayName: streamkAdapter.displayName,
  },
  "practice_intro->practice_runtime": {
    toProduct: "Prometheus",
    buildHandoff: (manifest) => buildStreamKToPrometheusHandoff(manifest),
    describeWithAdapter: (handoff) =>
      prometheusAdapter.describeHandoff(handoff as Parameters<typeof prometheusAdapter.describeHandoff>[0]),
    adapterDisplayName: prometheusAdapter.displayName,
  },
  "reflection->living_echo": {
    toProduct: "Living Echo",
    buildHandoff: (manifest, extras) =>
      buildPrometheusToLivingEchoHandoff(manifest, extras?.completedAt ?? new Date().toISOString()),
    describeWithAdapter: (handoff) =>
      livingEchoAdapter.describeHandoff(handoff as Parameters<typeof livingEchoAdapter.describeHandoff>[0]),
    adapterDisplayName: livingEchoAdapter.displayName,
  },
  "recommendation->arena": {
    toProduct: "Arena",
    buildHandoff: (manifest, extras) =>
      buildLivingEchoToArenaHandoff(manifest, extras?.recommendationReason ?? "practice_completed"),
    describeWithAdapter: (handoff) =>
      arenaAdapter.describeHandoff(handoff as Parameters<typeof arenaAdapter.describeHandoff>[0]),
    adapterDisplayName: arenaAdapter.displayName,
  },
};

/** Returns the real boundary this transition crosses, or null when `from -> to` stays within one product/stage. */
export function boundaryCrossing(from: JourneyStepId, to: JourneyStepId): BoundaryCrossing | null {
  return BOUNDARY_CROSSINGS[`${from}->${to}`] ?? null;
}
