import type { PrometheusToLivingEchoHandoff } from "@avatark/journey";
import type { AdapterDescribeResult, IntegrationAdapter } from "./adapterTypes.ts";

// Real today, narrowly: the RC5 signed-completion-receipt loop
// (lib/onboarding/receipt.ts, verified server-side in app/continue) is
// the one boundary this platform actually observes -- a verified
// completion fact, never Living Echo's actual contents (that stays
// PrometheusK's own internal record).
export const livingEchoAdapter: IntegrationAdapter<PrometheusToLivingEchoHandoff> = {
  productId: "living-echo",
  displayName: "Living Echo",
  describeHandoff(handoff): AdapterDescribeResult {
    if (!handoff) {
      return {
        accepted: false,
        availability: "available",
        message: "No completed practice to record yet.",
      };
    }
    return {
      accepted: true,
      availability: "available",
      message:
        "Real today via the RC5 signed-completion-receipt loop (lib/onboarding/receipt.ts, app/continue) -- a verified completion fact only, never Living Echo's actual contents.",
    };
  },
};
