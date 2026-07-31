import type { JourneyStepId } from "./stateMachine.ts";

// ============================================================
// Deep Link Builder -- consistent route metadata for the Entry Engine's
// journey steps. Every href mirrors lib/echo/links.ts's existing
// constants (ENTER_INVITATION_HREF, WATCH_FIRST_HREF, practiceDetailHref)
// rather than importing that module directly -- lib/echo/links.ts pulls
// in "@/..." alias imports (the product registry) that this repo's
// plain `node --test` runner can't resolve, the same reason every other
// lib/*.ts file covered by that runner (destination.ts, practiceHandoff.ts,
// streamHandoff.ts) sticks to relative imports only. Keep these three
// literals in sync with lib/echo/links.ts if that file ever changes.
// Every href is honestly marked `available: false` when no real Next.js
// route resolves it yet, same convention as DestinationPreview.available
// in lib/invitations/destination.ts. Building one of these never
// redesigns or adds a page -- it only describes where a step's real
// route is, or isn't, today.
const ENTER_INVITATION_HREF = "/enter";
const WATCH_FIRST_HREF = "/watch-first";
function practiceDetailHref(id: string): string {
  return `/practice/${id}`;
}
export interface DeepLink {
  href: string;
  step: JourneyStepId;
  /** True only if a real Next.js route resolves this href today. */
  available: boolean;
}

function withQuery(href: string, params: Record<string, string | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

/** /enter/{token} -- real (app/enter/[token]). Token encoding matches
 *  the existing /enter form's convention (lib/invitations/tokenFormat.ts's
 *  documented Next.js dynamic-segment colon quirk). */
export function enterInvitationLink(token: string, params?: { intention?: string }): DeepLink {
  return {
    href: withQuery(`${ENTER_INVITATION_HREF}/${encodeURIComponent(token)}`, { intention: params?.intention }),
    step: "invitation_received",
    available: true,
  };
}

/** /watch-first (real, static) when no storySlug is given; /watch-first/{id}
 *  (no such dynamic route exists yet -- prepared, not real) when one is. */
export function watchFirstLink(storySlug?: string | null): DeepLink {
  if (!storySlug) {
    return { href: WATCH_FIRST_HREF, step: "watch_first", available: true };
  }
  return { href: `${WATCH_FIRST_HREF}/${encodeURIComponent(storySlug)}`, step: "watch_first", available: false };
}

/** /witness/{slug} -- real (app/witness/[slug]), the practice intro step's
 *  actual route. Distinct from practiceDetailLink's /practice/{id} below,
 *  which is a different, already-real browsing route. */
export function practiceIntroLink(
  practiceSlug: string,
  params?: { invitation?: string; intention?: string; cohort?: string }
): DeepLink {
  return {
    href: withQuery(`/witness/${encodeURIComponent(practiceSlug)}`, params ?? {}),
    step: "practice_intro",
    available: true,
  };
}

/** /practice/{id} -- real (app/practice/[id]), delegating to
 *  lib/echo/links.ts's practiceDetailHref so the href stays a single
 *  source of truth. */
export function practiceDetailLink(practiceId: string): DeepLink {
  return { href: practiceDetailHref(practiceId), step: "practice_intro", available: true };
}

/** /journey/today (real) when no journeyId is given; /journey/{id} (no
 *  dynamic route exists yet -- prepared, not real) when one is. */
export function journeyLink(journeyId?: string): DeepLink {
  if (!journeyId) {
    return { href: "/journey/today", step: "living_echo", available: true };
  }
  return { href: `/journey/${encodeURIComponent(journeyId)}`, step: "living_echo", available: false };
}
