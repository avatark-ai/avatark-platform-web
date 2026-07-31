import type { LivingEchoToArenaHandoff } from "@avatark/journey";
import type { AdapterDescribeResult, IntegrationAdapter } from "./adapterTypes.ts";

// No ArenaK integration exists anywhere in this repo -- a distinct,
// larger, unscoped effort (docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md).
// Always "not_implemented", same honesty as HANDOFF_CONTRACTS.md's
// Living Echo -> Arena section.
export const arenaAdapter: IntegrationAdapter<LivingEchoToArenaHandoff> = {
  productId: "arenak",
  displayName: "Arena",
  describeHandoff(handoff): AdapterDescribeResult {
    if (!handoff) {
      return {
        accepted: false,
        availability: "not_implemented",
        message: "No recommendation prepared for this journey yet.",
      };
    }
    return {
      accepted: false,
      availability: "not_implemented",
      message: "No ArenaK integration exists anywhere in this repo yet -- contract only.",
    };
  },
};
