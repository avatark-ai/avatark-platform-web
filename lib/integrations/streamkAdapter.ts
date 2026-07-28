import type { EchoToStreamKHandoff } from "../journey/handoffContracts.ts";
import type { AdapterDescribeResult, IntegrationAdapter } from "./adapterTypes.ts";

// No real per-story StreamK mapping exists -- lib/onboarding/streamHandoff.ts's
// registry is deliberately empty (no story content ships, no StreamK
// content id has ever been verified). Always "not_implemented", same
// honesty as HANDOFF_CONTRACTS.md's Echo -> StreamK section.
export const streamkAdapter: IntegrationAdapter<EchoToStreamKHandoff> = {
  productId: "streamk",
  displayName: "StreamK",
  describeHandoff(handoff): AdapterDescribeResult {
    if (!handoff) {
      return {
        accepted: false,
        availability: "not_implemented",
        message: "No Watch First content named for this journey yet.",
      };
    }
    return {
      accepted: false,
      availability: "not_implemented",
      message:
        "StreamK integration doesn't exist yet -- lib/onboarding/streamHandoff.ts's registry is deliberately empty. This handoff is prepared, not deliverable.",
    };
  },
};
