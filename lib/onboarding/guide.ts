// Thin compatibility shim over the generalized Echo content model
// (content/echo/echoes/*.md, lib/content/echo.ts). Was previously a single
// hardcoded Guide constant; app/guide/[slug] now looks up any slug in the
// real registry, so this file only re-exports the shape callers already
// depend on. GUIDE_SLUG/GUIDE resolve to whichever Echo is first in the
// registry today (the-returner) -- adding more Echoes never requires this
// file to change.
import { getEchoBySlug, listEchoes } from "@/lib/content/echo";

export const GUIDE_SLUG = listEchoes()[0]?.slug ?? "the-returner";

export interface Guide {
  archetype: string;
  role: string;
  mission: string;
  giftMessage: string;
}

export function getGuide(slug: string): Guide | null {
  const echo = getEchoBySlug(slug);
  if (!echo) return null;
  return {
    archetype: echo.name,
    role: echo.role,
    mission: echo.mission,
    giftMessage: echo.giftMessage,
  };
}

export const GUIDE: Guide = getGuide(GUIDE_SLUG) ?? {
  archetype: "",
  role: "",
  mission: "",
  giftMessage: "",
};
