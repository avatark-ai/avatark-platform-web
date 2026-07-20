import { getProductById } from "@avatark/product-registry";
import { resolveProductUrl } from "../products/registry.ts";

// PrometheusK owns practice runtime, reflection, evidence, and Living
// Echo -- this repo only ever links out to its real, confirmed-live
// routes. Never reimplement practice/reflection logic here.
//
// Resolved through the same registry every other cross-product link uses
// (session 1B cleanup) instead of a second hardcoded copy of PrometheusK's
// domain -- this file predates @avatark/product-registry, which is why it
// had its own literal.
const prometheuskProduct = getProductById("prometheusk");
export const PROMETHEUSK_ORIGIN =
  (prometheuskProduct && resolveProductUrl(prometheuskProduct)) || "https://prometheusk.avatark.io";

// The "Drift" practice under the "Builder Journey", confirmed live via
// direct request (2026-07-15):
// https://prometheusk.avatark.io/my/borrow/builder-journey/practice/aad2380d-8d13-4499-8ac9-eb37d9f41cbb
const BUILDER_JOURNEY_ID = "builder-journey";
// Exported so lib/onboarding/receipt.ts has one source of truth for the
// single RC5 receipt-eligible practice, instead of a second copy of
// this literal.
export const DRIFT_PRACTICE_ID = "aad2380d-8d13-4499-8ac9-eb37d9f41cbb";

export interface OnboardingHandoffContext {
  intention?: string | null;
  witness: string;
  invitation?: string | null;
  cohort?: string | null;
  /** Absolute URL on this platform, e.g. https://host/continue */
  returnTo: string;
}

// UPDATED for RC5 (docs/RC5_HANDOFF_CONTRACT.md): the practice runtime
// itself still doesn't read these as a generic contract, but RC5 added
// specific, narrow support for exactly this shape -- BorrowedPracticePage
// now reads `source`/`state`/`returnTo` to decide whether to offer a
// receipt-backed "Return to AvatarK" CTA once the practice/reflection/
// echo chain completes. `returnTo` is never auto-redirected to (no open
// redirect); it's only ever handed to the signed completion receipt as
// the destination for a user-initiated click. `witness`/`intention`/
// `invitation`/`cohort` remain unread breadcrumbs, same as before RC5.
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

// RC4 integration point: for a user who already has an active practice,
// PrometheusK's own homepage (`/`) already resumes the right practice
// for a signed-in visitor (`lib/home/useNextAction.ts`) and renders a
// personalized recommendation alongside it (`TodaysRecommendationCard`)
// -- with zero query params. Confirmed via a prometheusk-web code audit
// (2026-07-15, docs/RC4_ROUTE_CONTRACT.md): no dedicated "continue" or
// "recommend" route exists, but this shared dashboard already does
// both, so this repo does not need to guess a practice ID for returning
// users the way buildBorrowUrl above does for first-time ones.
//
// `source` is appended only for PrometheusK-side log inspection, same
// as buildBorrowUrl's inert params -- the homepage reads no query
// params today (confirmed by the same audit), so this is not a real
// integration surface, just a breadcrumb.
export function buildContinueUrl(): string {
  const url = new URL("/", PROMETHEUSK_ORIGIN);
  url.searchParams.set("source", "avatark-platform");
  return url.toString();
}
