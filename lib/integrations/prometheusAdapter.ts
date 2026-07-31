import type { StreamKToPrometheusHandoff } from "@avatark/journey";
import { isPracticeHandoffAvailable } from "../onboarding/practiceHandoff.ts";
import type { AdapterDescribeResult, IntegrationAdapter } from "./adapterTypes.ts";

// The real mechanism exists (lib/onboarding/practiceHandoff.ts +
// prometheusk.ts's buildBorrowUrl) -- always "available" as a mechanism,
// but `accepted` still reflects whether THIS practice is actually
// mapped, so an unmapped practice never reads as falsely accepted.
export const prometheusAdapter: IntegrationAdapter<StreamKToPrometheusHandoff> = {
  productId: "prometheusk",
  displayName: "PrometheusK",
  describeHandoff(handoff): AdapterDescribeResult {
    if (!handoff) {
      return {
        accepted: false,
        availability: "available",
        message: "No practice named for this journey yet.",
      };
    }
    const accepted = isPracticeHandoffAvailable(handoff.practiceId);
    return {
      accepted,
      availability: "available",
      message: accepted
        ? `Real handoff mechanism (lib/onboarding/practiceHandoff.ts + prometheusk.ts) -- "${handoff.practiceId}" is mapped.`
        : `Real handoff mechanism exists, but "${handoff.practiceId}" has no verified PrometheusK match yet (see practiceHandoff.ts).`,
    };
  },
};
