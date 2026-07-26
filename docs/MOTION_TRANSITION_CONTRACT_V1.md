# Cross-Product Motion Transition Contract — V1

**Status:** local departure side implemented in `avatark-platform-web`
(`components/motion/DepartureLink.tsx`). Destination-side behavior is **not**
implemented anywhere — those live in separate repositories not open in this
session. This document specifies the contract so each destination repo can
adopt its own arrival side later, independently, without another
cross-repo coordination pass.

**Scope:** this only covers a user leaving `avatark.ai` (institutional site)
for a sibling AvatarK product on its own domain — PrometheusK, ArenaK,
StreamK, CinemaK, GameK, SetpointK, Atlas, StudioK. It does not cover
same-app navigation (e.g. `/start` into Echo, which stays a plain Next.js
`<Link>`), and it does not implement any shared visual asset, API, or
build-time dependency between repos — each side reads this document and
implements its own half in its own stack.

---

## 1. Why a contract instead of a shared component

The six repos in the AvatarK ecosystem are independent codebases on
independent domains. A real animated hand-off (e.g. a shared element
morphing across a page navigation) would require either a single shared
frontend runtime across domains (not the current architecture) or the
browser's cross-document View Transitions API restricted to same-origin
navigations today — unusable across `avatark.ai` → `prometheusk.avatark.io`.

So instead of one shared implementation, this is a **contract**: a fixed,
small vocabulary both sides agree to render independently, timed so the
departure cue (this repo) and the eventual arrival cue (the destination
repo, whenever it's built) read as one continuous idea to the user even
though no state or code crosses the navigation.

## 2. The local departure contract (implemented here)

Component: `components/motion/DepartureLink.tsx`. Applied to every outbound
link to a sibling product's own domain (`/ecosystem`'s product cards,
the institutional footer's Ecosystem column) — never to same-app routes,
`mailto:`, or other non-product links.

Sequence on a plain left-click (see `DEPARTURE_DELAY_MS`):

1. **User activates the CTA.** Normal link, normal target — nothing about
   the link is different until this component's click handler runs.
2. **The focal mark responds.** One localized RIPPLE (same primitive as
   `RippleLink`, same `motion-ripple-span` CSS) spawns from the pointer
   position.
3. **One short, fixed cue plays.** `DEPARTURE_DELAY_MS = 180ms` — long
   enough for the ripple to read as intentional, short enough that the
   click still feels immediate.
4. **Navigation proceeds.** `window.location.href = href` — a real,
   full-page navigation (this is a cross-origin hop; there is no
   client-side route to preserve).

### Navigation constraints (non-negotiable)

- **Modifier keys and middle-click bypass the cue entirely.** `ctrlKey`,
  `metaKey`, `shiftKey`, `altKey`, or `button !== 0` all skip
  `preventDefault()` — the browser's native "open in new tab/window"
  behavior is untouched. Intercepting these would break a well-worn
  browser convention and would be an accessibility regression.
- **`target="_blank"` bypasses the cue.** Same reasoning.
- **`prefers-reduced-motion: reduce` bypasses the delay.** There is no
  cue to wait for, so the link navigates immediately, same as a plain `<a>`.
- **A missing `href` bypasses the cue** (nothing to navigate to).
- **The delay is never long enough to feel broken.** 180ms is within this
  system's general micro-interaction budget (120–260ms) and well under
  the "does this feel unresponsive" threshold.
- **No fake loading screen, no intermediate route, no spinner.** The cue is
  a ripple on the link itself, not a full-page takeover.

## 3. Motion budget for this contract

| Property | Value |
|---|---|
| Cue primitive | RIPPLE (existing primitive, not a new one) |
| Delay before navigation | 180ms fixed |
| Easing | `ease-out` (matches `--motion-duration-ripple`'s existing usage) |
| Reduced motion | Delay skipped entirely; navigation is immediate |
| Repeat behavior | N/A — a departure only happens once per click, there is no ambient/looping state |

## 4. Suggested per-pair visual language (conceptual, not implemented)

These describe how a **destination repo** could shape its own arrival
motion so the transition reads as one continuous idea, entirely within
that repo's own stack, on its own schedule. None of this is implemented by
this repository — it's a shared vocabulary for whoever builds the arrival
side.

| Departure | Suggested arrival framing |
|---|---|
| AvatarK → Echo | The four-axis geometry resolves into a single ring — the "Echo" shape — as the practice becomes personal. |
| Echo → PrometheusK | The Echo ring settles into a practice orb — the shape narrows from "a life's shape" to "a session's shape." |
| PrometheusK → ArenaK | The private practice orb expands outward into a witnessed evidence frame — solitary becomes shared. |
| ArenaK → StreamK | The evidence frame becomes a story frame — proof becomes narrative. |
| StreamK → CinemaK | The story frame expands into cinematic space — one story becomes a shared screening. |

Each destination repo is free to interpret, simplify, or reject its own row
entirely — this table is a starting point for a consistent *feeling*
across the ecosystem, not a locked spec for the arrival side. If a
destination repo builds an arrival treatment, it should still independently
honor Section 5 below.

## 5. Requirements any adopting repo (departure or arrival side) must meet

Restating this system's own non-negotiables, since they apply regardless of
which side of a transition a given repo is building:

- Honor `prefers-reduced-motion` — remove travel/delay, show the settled
  state immediately.
- Never trap focus or move it unexpectedly across the navigation.
- Never rely on a shared JS runtime, shared component library, or shared
  build step between repos — this is a visual/timing contract only.
- Never delay a real navigation for longer than a single short, fixed cue.
- Never fabricate a loading state that doesn't reflect real load progress.
- Keep the cue on the interactive element itself (or a small area around
  it) — never a full-viewport takeover.

## 6. What is explicitly out of scope for this pass

- Any destination-side implementation (PrometheusK, ArenaK, StreamK,
  CinemaK, GameK, SetpointK, Atlas, StudioK repos are not open in this
  session).
- Any shared cross-domain state, session hand-off, or navigation payload.
- The View Transitions API, which only applies same-origin today and
  cannot be used across these domains regardless.
- Any change to product URLs, the product registry, or ecosystem
  destinations — this contract only adds a local interaction layer on top
  of the existing, unchanged hrefs.
