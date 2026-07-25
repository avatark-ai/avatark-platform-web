// Client-safe display copy for the current default practice, hand-synced
// with content/echo/practices/the-promise-to-myself.md.
//
// This is deliberately NOT sourced from lib/content/echo.ts: that reader
// uses node:fs and can only run server-side, but this file's three
// existing consumers (components/HomeContinuity.tsx,
// app/journey/today/page.tsx, app/journey/history/page.tsx) are client
// components rendering from live, client-fetched session state. Every
// *new* Echo route that needs full generality (app/witness/[slug],
// app/guide/[slug], Discover, Echo detail, Practice detail, Start Here)
// reads lib/content/echo.ts directly instead of this file. See
// docs/ECHO_CONTENT_MODEL.md for the follow-up to wire these three
// client surfaces to the real registry (e.g. via a small API route),
// once there is more than one practice for them to ever need to reflect.
export const WITNESS_SLUG = "the-promise-to-myself";
export const WITNESS_LABEL = "The Promise to Myself";
export const PRACTICE_LABEL = "The Two-Minute Check-In";
