# Institutional Motion System — V1

**Scope:** `avatark-platform-web`'s institutional shell only — `/`, `/foundation`,
`/canon` and its sub-routes, `/founder` and its sub-routes, `/ecosystem`.
The Echo consumer application (`components/echo/*`, `/start`, `/journey`,
`/account`, etc.) is untouched and out of scope; this document does not
apply there.

**Source of truth:** `app/globals.css` (tokens, keyframes, utility classes)
and `components/motion/*.tsx` (the small set of client components that
trigger them). This document explains the *system*; the CSS/TSX comments
explain each specific rule.

---

## 1. The six canonical primitives

| Primitive | What it means | Where it's used |
|---|---|---|
| **EMERGE** | Opacity + a small controlled translate. An element becoming perceptible. | Page entry, Founder chapter transitions, card/plate grids, Four Axes nodes, Living Spiral nodes |
| **DRAW** | An SVG line/path progressively appears via `stroke-dasharray`/`stroke-dashoffset`. | Living Spiral loop, Founder/Canon four-axis geometry lines, Foundation diagram connectors |
| **CONNECT** | Separate nodes read as one intelligible system once their connecting line has drawn. | Same diagrams as DRAW — CONNECT is what DRAW is *for*, not a separate implementation |
| **SETTLE** | Motion resolves into stillness. | The tail end of every EMERGE/DRAW keyframe — reaching `opacity:1`/`translateY(0)`/`stroke-dashoffset:0` *is* settling, not a separate animation |
| **RIPPLE** | A localized, one-shot response to a meaningful action or arrival. | `RippleLink` (pointer position, on click), `FourAxesGeometry`'s active-node pulse (on tab change), `.motion-ripple-once` (static, on a lineage chain's final node), `DepartureLink` (cross-product departure cue) |
| **BREATHE** | An extremely subtle, slow, low-contrast ambient opacity pulse. | Exactly one place: the Living Spiral's Discover node, after its traveling signal returns |

No primitive has more than one CSS keyframe. Where a primitive needs a
second *duration* (e.g. a shorter DRAW for one leg of a staged sequence vs.
a whole diagram), that's a second token (`--motion-duration-draw-fast`),
never a second keyframe with different semantics.

## 2. Shared tokens (`app/globals.css`, `:root`)

```
--motion-ease-settle: cubic-bezier(0.16, 1, 0.3, 1);
--motion-duration-emerge: 500ms;
--motion-duration-draw: 1100ms;
--motion-duration-draw-fast: 450ms;
--motion-duration-ripple: 650ms;
--motion-duration-breathe: 3400ms;
--motion-duration-travel: 1600ms;   /* Living Spiral's one traveling signal */
--motion-stagger-step: 55ms;
```

Every element that plays one of these animations can also set, inline, via
`style`:

- `--motion-delay` — a generic per-element offset (default `0ms`), used to
  choreograph a staged sequence (e.g. the Four Axes geometry's ~2.3s
  entrance) out of the same shared keyframes, without a bespoke keyframe
  per stage. Supported by `.motion-emerge`, `.motion-emerge-stagger`
  (added on top of each child's own stagger step), `.motion-draw`,
  `.motion-draw-fast`, `.motion-breathe`, `.motion-signal-travel`, and
  `.motion-ripple-once`.
- `--motion-emerge-to` — overrides EMERGE's final opacity (default `1`) for
  an element that should settle dimmed rather than fully opaque (e.g. a
  muted "transaction" dot in the Foundation diagrams).

## 3. Utility classes

| Class | Primitive | Trigger |
|---|---|---|
| `.motion-emerge` | EMERGE | `.is-revealed` ancestor or self (see `:is()` note below) |
| `.motion-emerge-stagger` (on a parent; targets `> *`) | EMERGE, staggered | same |
| `.motion-emerge-instant` | EMERGE (opacity-only, no gate) | plays on every mount — for repeatable UI swaps (tab/accordion content, mobile nav opening), not one-time reveals |
| `.motion-draw` / `.motion-draw-fast` | DRAW | `.is-revealed` |
| `.motion-draw-then-breathe` | DRAW, then BREATHE forever | `.is-revealed` |
| `.motion-signal-travel` | CONNECT (a signal traveling an already-drawn path via `offset-path`) | `.is-revealed` |
| `.motion-breathe` | BREATHE | plays after its own `--motion-delay` elapses |
| `.motion-ripple-span` | RIPPLE (pointer position) | spawned/removed by `RippleLink`/`DepartureLink` |
| `.motion-ripple-node` | RIPPLE (SVG node) | JS toggles `.is-pulsing`, re-keyed to replay |
| `.motion-ripple-once` | RIPPLE (static, one-time) | `.is-revealed` + `--motion-delay` |
| `.link-underline-draw` | DRAW (applied to a plain-HTML underline via `background-size`, not SVG) | `:hover` / `:focus-visible` |
| `.motion-instant` | forces the settled end-state, no animation | applied by `RevealOnView`'s `sessionKey` prop when a diagram already played this session |

**A recurring pattern:** `.is-revealed` is added by `RevealOnView` to the
wrapper *it* renders. Depending on how a caller uses it, the primitive
class ends up either on that same wrapper (`className` passed straight
into `RevealOnView`) or on a nested descendant (e.g. an SVG `<g>` several
levels inside). Rather than requiring every caller to remember which
pattern applies, every gated rule uses
`:is(.is-revealed .motion-x, .motion-x.is-revealed)` so both work.

## 4. Components (`components/motion/`)

- **`RevealOnView`** — one-shot `IntersectionObserver`: marks itself
  `.is-revealed` the first time it scrolls into view (threshold 0.25),
  then disconnects. Optional `sessionKey` prop remembers (via
  `sessionStorage`) that this instance already played once this session —
  a later mount renders `.motion-instant` immediately instead of
  replaying. Used by the Living Spiral specifically, per the brief's
  "prefer the settled state on revisit" requirement.
- **`PageEnter`** — wraps `InstitutionalLayout`'s `<main>` content, keyed on
  `usePathname()`. Gives every institutional page an EMERGE/SETTLE
  entrance; since each page independently renders `InstitutionalLayout`
  rather than sharing one persistent Next.js `layout.tsx`, this is also
  the entire implementation of the Founder chapter-to-chapter transition.
- **`RippleLink`** — wraps `next/link` for same-app navigation; spawns a
  `.motion-ripple-span` at the pointer position on `pointerdown`.
- **`DepartureLink`** — the *local* half of the cross-product transition
  contract (see `docs/MOTION_TRANSITION_CONTRACT_V1.md`) for links that
  leave this app for a sibling product's own domain. Preserves standard
  browser behavior for modifier-keys/middle-click/`target="_blank"`;
  otherwise plays one ripple + a fixed 180ms cue before navigating.
- **`FourAxesGeometry`** (`components/foundation/geometry/`) — the shared
  four-axis cross diagram used by both `/canon` (interactive, tied to the
  Four Axes tabs via `activeIndex`) and `/founder/synthesis` (a plain
  one-time entrance, no `activeIndex`). Extracted specifically so this
  geometry exists once, not as two near-duplicate SVGs.

## 5. Accessibility guarantees

- **`prefers-reduced-motion: reduce`** (global rule in `app/globals.css`):
  collapses every `animation-duration`/`transition-duration` to `0.01ms`,
  every `animation-iteration-count` to `1`, and critically also every
  `animation-delay`/`transition-delay` to `0ms` — a staged sequence with
  up to ~1.8s of cumulative delay must not still make a reduced-motion
  user wait through that chain before each (now-instant) step snaps into
  place.
- **JavaScript disabled:** a `<noscript>` stylesheet in `app/layout.tsx`
  forces every gated class back to its fully-visible resting state, since
  `RevealOnView`/`PageEnter` (both client components) never run to add
  `.is-revealed`.
- **Keyboard:** every interactive element this system touches keeps its
  existing `focus-visible` outline treatment; none of the additions here
  suppress or redirect focus. The Four Axes tabs' sliding indicator and
  crossfade do not change keyboard tab order or activation.
- **No content is ever gated behind motion alone** — every animated
  element's *content* (text, links, diagram labels) is present in the DOM
  and reachable/readable regardless of whether its entrance animation has
  played.

## 6. Motion hierarchy and budget (as implemented)

1. **Narrative** (Level 1): Four Axes geometry entrance, Living Spiral
   entrance + traveling signal, Foundation diagram sequences. At most one
   plays per viewport at a time — the sequences are scroll-triggered, not
   concurrent by construction.
2. **Supporting** (Level 2): page-entry/chapter transitions, card/plate
   grid emergence, tab crossfade.
3. **Micro** (Level 3): nav active-state color, card hover lift (≤4px),
   button hover elevation, text-link underline draw, directional
   prev/next arrow nudge, CTA ripple.

Durations stay within: page-entry <500ms; micro-interactions 120–260ms;
the one exception is a full staged SVG draw sequence (Four Axes' ~2.3s
entrance, Living Spiral's draw+travel), which the budget explicitly
permits going over 900ms for.
