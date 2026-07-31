import {
  transition,
  JOURNEY_STEP_ORDER,
  type JourneyStepId,
  createJourneyManifest,
  type JourneyManifest,
  type JourneySource,
  type JourneyEntryPoint,
} from "@avatark/journey";
import { INTEGRATION_STAGE_ORDER, productForStep, boundaryCrossing, type IntegrationProduct } from "./stages.ts";

// ============================================================
// The Integration Simulator: walks a JourneyManifest through one of four
// fixed, real paths (every step-to-step move is a call to the frozen
// transition() from lib/journey/stateMachine.ts -- never a new
// transition rule) and reports the exact handoff object at each of the
// 5 fixed stages, in the mission's own order, always all 5 rows even
// when a scenario's path skips one.
export type SimulatorScenario = "invitation" | "practice" | "watch_first" | "journey";
export type SimulatorAuthState = "guest" | "signed_in";

export interface SimulatorStageView {
  product: IntegrationProduct;
  /** False when this scenario's path never visits this stage. */
  visited: boolean;
  steps: JourneyStepId[];
  manifestAtEntry: JourneyManifest | null;
  incomingHandoff: unknown;
  incomingHandoffNote: string;
}

// Each scenario's fixed path -- a real, legal sequence of JourneyStepId
// transitions (verified against lib/journey/stateMachine.ts's own graph
// in simulate.test.ts), one per mission-named entry point.
const SCENARIO_PATHS: Record<SimulatorScenario, JourneyStepId[]> = {
  invitation: [
    "invitation_received",
    "invitation_accepted",
    "watch_first",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
    "arena",
  ],
  practice: ["practice_intro", "practice_runtime", "reflection", "living_echo", "recommendation", "arena"],
  watch_first: [
    "watch_first",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
    "arena",
  ],
  journey: ["reflection", "living_echo", "recommendation", "arena"],
};

const SCENARIO_ENTRY: Record<SimulatorScenario, { source: JourneySource; entryPoint: JourneyEntryPoint }> = {
  invitation: { source: "invitation", entryPoint: "enter" },
  practice: { source: "direct", entryPoint: "witness" },
  watch_first: { source: "direct", entryPoint: "watch-first" },
  journey: { source: "resume", entryPoint: "journey" },
};

// Representative sample content each scenario names -- the same slugs
// used throughout this repo's own tests/content (the-promise-to-myself
// is Echo's one real seed practice). `returnTo` is always set: both real
// handoff builders (buildEchoToStreamKHandoff, buildStreamKToPrometheusHandoff)
// require it to produce a non-null handoff.
function buildInitialManifest(scenario: SimulatorScenario, authState: SimulatorAuthState, journeyId: string): JourneyManifest {
  const startStep = SCENARIO_PATHS[scenario][0];
  const completedSteps = JOURNEY_STEP_ORDER.slice(0, JOURNEY_STEP_ORDER.indexOf(startStep));
  const entry = SCENARIO_ENTRY[scenario];

  const contentByScenario: Record<SimulatorScenario, { invitationId: string | null; practiceId: string | null; watchFirstId: string | null; returnTo: string }> = {
    invitation: {
      invitationId: "tok_demo_invitation",
      practiceId: "the-promise-to-myself",
      watchFirstId: "story-demo",
      returnTo: "/continue",
    },
    practice: { invitationId: null, practiceId: "the-promise-to-myself", watchFirstId: null, returnTo: "/continue" },
    watch_first: {
      invitationId: null,
      practiceId: "the-promise-to-myself",
      watchFirstId: "story-demo",
      returnTo: "/continue",
    },
    journey: { invitationId: null, practiceId: "the-promise-to-myself", watchFirstId: null, returnTo: "/journey/today" },
  };
  const content = contentByScenario[scenario];

  return createJourneyManifest({
    journeyId,
    source: entry.source,
    entryPoint: entry.entryPoint,
    invitationId: content.invitationId,
    practiceId: content.practiceId,
    watchFirstId: content.watchFirstId,
    returnTo: content.returnTo,
    nextStep: startStep,
    completedSteps,
    metadata: { authState },
  });
}

interface PathEntry {
  step: JourneyStepId;
  manifestAtStep: JourneyManifest;
}

function walkPath(scenario: SimulatorScenario, authState: SimulatorAuthState, journeyId: string): PathEntry[] {
  const path = SCENARIO_PATHS[scenario];
  let manifest = buildInitialManifest(scenario, authState, journeyId);
  const entries: PathEntry[] = [{ step: path[0], manifestAtStep: manifest }];

  for (let i = 1; i < path.length; i++) {
    const result = transition(manifest, path[i]);
    if (!result.ok || !result.manifest) {
      throw new Error(`Simulator path for "${scenario}" attempted an illegal transition: ${result.reason}`);
    }
    manifest = result.manifest;
    entries.push({ step: path[i], manifestAtStep: manifest });
  }
  return entries;
}

export function simulateJourney(
  scenario: SimulatorScenario,
  authState: SimulatorAuthState,
  journeyId: string,
  completedAt: string
): SimulatorStageView[] {
  const entries = walkPath(scenario, authState, journeyId);

  return INTEGRATION_STAGE_ORDER.map((product) => {
    const matching = entries.filter((entry) => productForStep(entry.step) === product);
    if (matching.length === 0) {
      return {
        product,
        visited: false,
        steps: [],
        manifestAtEntry: null,
        incomingHandoff: null,
        incomingHandoffNote: "n/a -- skipped in this scenario",
      };
    }

    const firstIndex = entries.indexOf(matching[0]);
    const previous = firstIndex > 0 ? entries[firstIndex - 1] : null;
    const crossing = previous ? boundaryCrossing(previous.step, matching[0].step) : null;

    let incomingHandoff: unknown = null;
    let incomingHandoffNote: string;
    if (!previous) {
      incomingHandoffNote = "n/a -- origin of this scenario";
    } else if (!crossing) {
      incomingHandoffNote = "n/a -- no product boundary crossed on this transition";
    } else {
      incomingHandoff = crossing.buildHandoff(previous.manifestAtStep, { completedAt, recommendationReason: "practice_completed" });
      const described = crossing.describeWithAdapter(incomingHandoff);
      incomingHandoffNote = `${crossing.adapterDisplayName}: ${described.message}`;
    }

    return {
      product,
      visited: true,
      steps: matching.map((entry) => entry.step),
      manifestAtEntry: matching[0].manifestAtStep,
      incomingHandoff,
      incomingHandoffNote,
    };
  });
}
