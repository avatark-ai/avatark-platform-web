import type { AdapterDescribeResult } from "./adapterTypes.ts";
import type { IntegrationProduct } from "./stages.ts";

// ============================================================
// The Integration Dashboard's ecosystem map -- a 7-node presentational
// chain (Avatar -> Echo -> Prometheus -> Living Echo -> Arena -> Stream
// -> Cinema), distinct from lib/integrations/stages.ts's 5-stage
// INTEGRATION_STAGE_ORDER (AvatarK/StreamK/Prometheus/Living Echo/Arena).
// Both are honest about the same underlying facts; they just group them
// differently for two different audiences (stages.ts groups by which
// JourneyStepId belongs to which stage for the developer dashboard;
// this file names the wider ecosystem for a dashboard viewer, using this
// repo's own established naming -- handoffContracts.ts's own header
// comment already calls the origin of the chain "Echo", not "AvatarK":
// "one interface per edge in the Entry Engine's architecture diagram
// (Echo -> StreamK -> PrometheusK -> Living Echo -> Arena)").
//
// "Avatar" (the identity/auth/account platform every stage runs on) and
// "Cinema" (no adapter, no handoff contract, no code anywhere in this
// repo) have no corresponding JourneyStepId today -- ecosystemStageForProduct
// never returns either, and describeIntegrationHealth (health.ts) states
// both honestly as static facts rather than journey-derived ones.
export type EcosystemStageId = "Avatar" | "Echo" | "Prometheus" | "Living Echo" | "Arena" | "Stream" | "Cinema";

export const ECOSYSTEM_STAGE_ORDER: EcosystemStageId[] = [
  "Avatar",
  "Echo",
  "Prometheus",
  "Living Echo",
  "Arena",
  "Stream",
  "Cinema",
];

// AvatarK's own journey steps (invitation_received/invitation_accepted/
// practice_intro, per stages.ts's STEP_PRODUCT) are Echo-branded pages
// throughout this repo (components/echo/*) -- so they map to "Echo" here,
// not "Avatar". StreamK's watch_first stage maps to "Stream" (the same
// product, plainer name). "Living Echo" and "Arena" already share their
// name with stages.ts's IntegrationProduct verbatim.
const PRODUCT_TO_ECOSYSTEM_STAGE: Record<IntegrationProduct, EcosystemStageId> = {
  AvatarK: "Echo",
  StreamK: "Stream",
  Prometheus: "Prometheus",
  "Living Echo": "Living Echo",
  Arena: "Arena",
};

export function ecosystemStageForProduct(product: IntegrationProduct): EcosystemStageId {
  return PRODUCT_TO_ECOSYSTEM_STAGE[product];
}

// The 4 statuses the mission asked the Integration Health panel to show.
// "optional" is deliberately not part of AdapterDescribeResult's
// "available" | "not_implemented" pair -- it names an edge this repo
// never modeled an adapter for at all (Cinema today), which is a
// different fact than "modeled, but not implemented yet."
export type IntegrationHealthStatus = "ready" | "waiting" | "missing_contract" | "optional";

/**
 * Maps one real adapter's honest describeHandoff() result onto the
 * mission's 4-status vocabulary -- never a new judgment call:
 * `not_implemented` (the adapter itself says the other product's side
 * doesn't exist yet) reads as "missing_contract"; `available` but not
 * `accepted` (the mechanism is real but this specific handoff isn't,
 * e.g. an unmapped practice) reads as "waiting"; `available` and
 * `accepted` reads as "ready".
 */
export function healthStatusFromAdapterResult(result: AdapterDescribeResult): IntegrationHealthStatus {
  if (result.availability === "not_implemented") return "missing_contract";
  return result.accepted ? "ready" : "waiting";
}

// Who owns fixing a gap at each stage -- for the Pending Actions/
// Recommendations UX pass only, never a new integration claim. Only
// states a repo name where this repo's own docs already confirm one
// (PrometheusK -> prometheusk-web, Arena -> a separate dt4m-os repo, per
// docs/INTEGRATION_READINESS_REPORT.md and handoffContracts.ts's own
// comments); Stream/Cinema get a product name only, no invented repo.
export const STAGE_OWNER: Record<EcosystemStageId, string> = {
  Avatar: "This repo (avatark-platform-web)",
  Echo: "This repo (avatark-platform-web)",
  Prometheus: "PrometheusK (prometheusk-web)",
  "Living Echo": "PrometheusK (prometheusk-web) -- Living Echo is its own internal record",
  Arena: "ArenaK (separate dt4m-os repo)",
  Stream: "StreamK",
  Cinema: "CinemaK",
};
