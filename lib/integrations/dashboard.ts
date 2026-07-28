import type { InvitationStatus } from "@avatark/invitations";
import type { JourneyStepId } from "../journey/stateMachine.ts";
import type { JourneyManifest } from "../journey/manifest.ts";
import { recoverJourney } from "../journey/recovery.ts";
import { productForStep, legalNextSteps, boundaryCrossing, type IntegrationProduct } from "./stages.ts";

// ============================================================
// The developer-dashboard read-out of a single JourneyManifest: current
// position, the legal next step(s), the exact handoff object for any of
// those that cross a real product boundary, and one honest status line.
// Calls the frozen recoverJourney (lib/journey/recovery.ts) -- never
// modifies it -- as the first source of truth for status.
export interface DashboardNextOption {
  step: JourneyStepId;
  product: IntegrationProduct;
  /** The exact handoff object if this step crosses a real product boundary, else null. */
  handoff: unknown;
  crossesBoundary: boolean;
}

export interface DashboardStatus {
  source: "recovery" | "adapter" | "ready";
  message: string;
}

export interface DashboardView {
  manifest: JourneyManifest;
  currentProduct: IntegrationProduct;
  currentStep: JourneyStepId;
  nextOptions: DashboardNextOption[];
  status: DashboardStatus;
}

export interface DescribeDashboardInput {
  practiceAvailable: boolean;
  watchFirstAvailable: boolean;
  invitationStatus: InvitationStatus | null;
}

export function describeDashboard(manifest: JourneyManifest, input: DescribeDashboardInput): DashboardView {
  const currentStep = manifest.nextStep;
  const currentProduct = productForStep(currentStep);

  const nextOptions: DashboardNextOption[] = legalNextSteps(currentStep).map((step) => {
    const crossing = boundaryCrossing(currentStep, step);
    return {
      step,
      product: productForStep(step),
      handoff: crossing ? crossing.buildHandoff(manifest) : null,
      crossesBoundary: crossing !== null,
    };
  });

  const recovery = recoverJourney({
    invitationStatus: input.invitationStatus,
    manifest,
    practiceAvailable: input.practiceAvailable,
    watchFirstAvailable: input.watchFirstAvailable,
  });

  let status: DashboardStatus;
  if (recovery) {
    status = { source: "recovery", message: recovery.message };
  } else {
    const crossingOption = nextOptions.find((option) => option.crossesBoundary);
    if (crossingOption) {
      const crossing = boundaryCrossing(currentStep, crossingOption.step)!;
      const described = crossing.describeWithAdapter(crossingOption.handoff);
      status = { source: "adapter", message: `${crossing.adapterDisplayName}: ${described.message}` };
    } else {
      status = { source: "ready", message: `Ready to advance within ${currentProduct}.` };
    }
  }

  return { manifest, currentProduct, currentStep, nextOptions, status };
}
