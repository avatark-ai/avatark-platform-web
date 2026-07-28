import { streamkAdapter } from "./streamkAdapter.ts";
import { prometheusAdapter } from "./prometheusAdapter.ts";
import { livingEchoAdapter } from "./livingEchoAdapter.ts";
import { arenaAdapter } from "./arenaAdapter.ts";
import { ECOSYSTEM_STAGE_ORDER, healthStatusFromAdapterResult, type EcosystemStageId, type IntegrationHealthStatus } from "./ecosystemMap.ts";

// ============================================================
// The Integration Health panel: one honest read-out per ecosystem stage,
// independent of any single journey's manifest -- "is this edge
// generally working today", not "is my example journey blocked on it".
// (Per-journey status/blockers belong to describeDashboard/dashboard.ts,
// unchanged.) The 4 boundary-crossing stages call their real, frozen
// adapter with the same representative demo content already used
// elsewhere in this repo (lib/integrations/simulate.ts's own demo
// values -- "the-promise-to-myself"/"tok_demo_invitation"/"story-demo")
// so the message text is concrete rather than a generic null-handoff
// placeholder. Avatar/Echo/Cinema have no adapter at all -- their status
// is a static, documented fact, not derived from adapter output.
export interface IntegrationHealthEntry {
  stage: EcosystemStageId;
  status: IntegrationHealthStatus;
  message: string;
}

const DEMO_JOURNEY_ID = "example-journey";

function streamHealth(): IntegrationHealthEntry {
  const result = streamkAdapter.describeHandoff({
    journeyId: DEMO_JOURNEY_ID,
    invitationId: "tok_demo_invitation",
    watchFirstId: "story-demo",
    returnTo: "/continue",
  });
  return { stage: "Stream", status: healthStatusFromAdapterResult(result), message: result.message };
}

function prometheusHealth(): IntegrationHealthEntry {
  const result = prometheusAdapter.describeHandoff({
    journeyId: DEMO_JOURNEY_ID,
    practiceId: "the-promise-to-myself",
    witness: "the-promise-to-myself",
    invitationId: "tok_demo_invitation",
    cohortId: null,
    returnTo: "/continue",
  });
  return { stage: "Prometheus", status: healthStatusFromAdapterResult(result), message: result.message };
}

function livingEchoHealth(): IntegrationHealthEntry {
  const result = livingEchoAdapter.describeHandoff({
    journeyId: DEMO_JOURNEY_ID,
    practiceId: "the-promise-to-myself",
    completedAt: "2026-07-28T00:00:00.000Z",
  });
  return { stage: "Living Echo", status: healthStatusFromAdapterResult(result), message: result.message };
}

function arenaHealth(): IntegrationHealthEntry {
  const result = arenaAdapter.describeHandoff({
    journeyId: DEMO_JOURNEY_ID,
    recommendationReason: "practice_completed",
    returnTo: "/journey/today",
  });
  return { stage: "Arena", status: healthStatusFromAdapterResult(result), message: result.message };
}

const STATIC_HEALTH: Record<"Avatar" | "Echo" | "Cinema", IntegrationHealthEntry> = {
  Avatar: {
    stage: "Avatar",
    status: "ready",
    message: "Identity, auth, account, and product access -- the pre-existing shared platform layer every product integrates with.",
  },
  Echo: {
    stage: "Echo",
    status: "ready",
    message: "The Entry Engine (invitation preview/acceptance, guest flow, practice intro routing) -- built and frozen.",
  },
  Cinema: {
    stage: "Cinema",
    status: "optional",
    message: "No CinemaK adapter or handoff contract exists anywhere in this repo -- outside this sprint's integration scope.",
  },
};

/** Pure, deterministic, and free of any manifest/journey instance -- one entry per ECOSYSTEM_STAGE_ORDER stage. */
export function describeIntegrationHealth(): IntegrationHealthEntry[] {
  const byStage: Record<EcosystemStageId, IntegrationHealthEntry> = {
    Avatar: STATIC_HEALTH.Avatar,
    Echo: STATIC_HEALTH.Echo,
    Prometheus: prometheusHealth(),
    "Living Echo": livingEchoHealth(),
    Arena: arenaHealth(),
    Stream: streamHealth(),
    Cinema: STATIC_HEALTH.Cinema,
  };
  return ECOSYSTEM_STAGE_ORDER.map((stage) => byStage[stage]);
}
