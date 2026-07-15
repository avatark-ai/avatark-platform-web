// PrometheusK owns practice runtime, reflection, evidence, and Living
// Echo -- this repo only ever links out to its real, confirmed-live
// routes. Never reimplement practice/reflection logic here.
export const PROMETHEUSK_ORIGIN = "https://prometheusk.avatark.io";

// The "Drift" practice under the "Builder Journey", confirmed live via
// direct request (2026-07-15):
// https://prometheusk.avatark.io/my/borrow/builder-journey/practice/aad2380d-8d13-4499-8ac9-eb37d9f41cbb
const BUILDER_JOURNEY_ID = "builder-journey";
const DRIFT_PRACTICE_ID = "aad2380d-8d13-4499-8ac9-eb37d9f41cbb";

export interface OnboardingHandoffContext {
  intention?: string | null;
  witness: string;
  invitation?: string | null;
  cohort?: string | null;
  /** Absolute URL on this platform, e.g. https://host/continue */
  returnTo: string;
}

// IMPORTANT: as of the RC1 Phase 1 audit (docs/ONBOARDING_ROUTE_CONTRACT.md),
// no route in prometheusk-web reads any query parameters on its practice
// runtime, and no route can redirect back to an external caller after
// completion. Every parameter appended here is inert until PrometheusK
// adds a returnTo contract -- this function still builds them (forward
// compatible, and useful for PrometheusK-side analytics/log inspection
// even unread) but callers must not assume a return trip will happen.
export function buildBorrowUrl(context: OnboardingHandoffContext): string {
  const url = new URL(
    `/my/borrow/${BUILDER_JOURNEY_ID}/practice/${DRIFT_PRACTICE_ID}`,
    PROMETHEUSK_ORIGIN
  );
  url.searchParams.set("source", "avatark-onboarding");
  url.searchParams.set("witness", context.witness);
  url.searchParams.set("returnTo", context.returnTo);
  if (context.intention) url.searchParams.set("intention", context.intention);
  if (context.invitation) url.searchParams.set("invitation", context.invitation);
  if (context.cohort) url.searchParams.set("cohort", context.cohort);
  return url.toString();
}
