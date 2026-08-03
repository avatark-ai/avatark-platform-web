# Ai4 Conference Demo

## Purpose

A standalone, presentation-only walkthrough of AvatarK for the Ai4 conference
(Aug 4–6, 2026). It exists to communicate one idea in under three minutes:

> The screen goes dark. The story does not end.
> Watch. Reflect. Continue.

It is not a feature of the production Echo/institutional site — it is a
self-contained kiosk experience, isolated in its own worktree
(`avatark-platform-web-ai4`, branch `feature/ai4-conference-demo`) so it can
be built, broken, and iterated on without touching the platform's real
routes, auth, or database.

## Demo entry route

**`/ai4`**

That single route hosts the entire journey. It is not nine separate pages —
it is one guided cinematic shell (`components/ai4/PresentationShell.tsx`)
that steps through nine in-place beats.

## Guided flow

| # | Beat | Component | What it shows |
|---|------|-----------|----------------|
| 01 | Watch | `components/ai4/steps/Watch.tsx` | Cinematic framing, no real video dependency |
| 02 | Reflect | `components/ai4/steps/Reflect.tsx` | Chip picker: Belonging · Wonder · Duty · Courage · Loss · Compassion · Hope · Return |
| 03 | Continue | `components/ai4/steps/Continue.tsx` | Conceptual bridge: Story → Reflection → Living World |
| 04 | Enter the Living Forest | `components/ai4/steps/EnterForest.tsx` | CSS/SVG procedural-world concept preview |
| 05 | Living Worlds | `components/ai4/steps/LivingWorlds.tsx` | Five premium cards: Between Heartbeats, Adhi Yogi, Krishna, Rama, Prometheus — each its own persistent living world |
| 06 | Practice | `components/ai4/steps/Practice.tsx` | Short breathing/ritual interaction |
| 07 | Echo | `components/ai4/steps/Echo.tsx` | The chosen reflection becomes a persistent "Echo" |
| 08 | Platform Architecture | `components/ai4/steps/PlatformArchitecture.tsx` | Architecture reveal: AvatarK → Living Worlds → GameK (FlowK/PathK/GeometryK/ChronicleK) → PrometheusK (Reflection → Practice → Creation → Echo → Legacy) |
| 09 | Return | `components/ai4/steps/Return.tsx` | Closing beat — every story continues, reason to come back |

Controls (all in `PresentationShell.tsx`): Previous / Next buttons,
clickable progress dots, `←`/`→` keyboard navigation, and a "Restart Demo"
button. The selected reflection chip and current step persist to
**localStorage only** (`ai4-demo-reflection`, `ai4-demo-step`) — refreshing
mid-demo resumes exactly where the visitor left off; there is no server-side
state and nothing is sent to Supabase or any API.

## Local run instructions

```bash
cd avatark-platform-web-ai4   # this worktree, not the main one
pnpm install
pnpm run dev
```

Then open `http://localhost:3000/ai4`.

`/ai4` itself needs no environment variables. However, the app's root
`proxy.ts` middleware still runs a Supabase session-refresh for every
*other* route, so a `.env.local` with **some** non-empty
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values is still
needed if you want to browse the rest of the site locally (e.g. `/`,
`/founder`) alongside the demo. See `.env.example`. These do not need to
point at a real project for `/ai4` to work.

## Deployment notes

- `/ai4` is excluded from `proxy.ts`'s middleware matcher (see the "Ai4
  Conference Demo" comment there) — it never invokes Supabase session
  refresh, so it has **no dependency on `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or any other env var, being configured at
  all**. It will serve correctly even if the rest of the deployment's
  Supabase config is missing or broken.
- No other route's middleware behavior changed.
- The route makes no external network calls of its own (no CMS, no API, no
  images from a CDN) — everything is static copy plus CSS/SVG, by design,
  for reliability on conference Wi-Fi.
- `components/echo/shell/EchoShell.tsx` excludes `/ai4` from the normal
  Echo header/footer/bottom-nav chrome (same mechanism already used for
  `/admin`, `/dev`, `/integration`), so the demo renders full-bleed.

## What is implemented

- The full 9-step guided journey, keyboard + button navigation, progress
  indicator, and Restart Demo.
- Reflection selection, persisted locally and threaded into later steps'
  copy (Living Forest, Echo, Return all reference the chosen word).
- A Living Forest concept preview (CSS/SVG only, no external imagery),
  honestly labeled: "Available now" (this preview, and reflection
  continuity) vs. "Future vision" (the six narrative arcs it lists —
  Vrindavan, Rama's forest exile, Ayodhya outskirts, Yamuna river
  environments, sacred groves, future original AvatarK stories). None of
  those six are claimed as built.
- A Living Worlds step naming five persistent worlds (Living Symphony,
  Living Stillness, Living Vrindavan, Living Forest, Living Forge) as cards
  — story, world, and theme only, no product branding.
- A Platform Architecture step revealing the shared engine underneath every
  world: AvatarK → Living Worlds → GameK's four dimensions (FlowK/PathK/
  GeometryK/ChronicleK) → PrometheusK as the knowledge layer (Reflection →
  Practice → Creation → Echo → Legacy). Concept only — no product marketing
  pages, no individual product routes.
- Full independence from authentication and from Supabase middleware.
- Verified: clean typecheck/lint/build, no console errors, no horizontal
  overflow at desktop (1280px) or mobile (390px) widths, refresh-safe.

## What is intentionally mocked

- **Watch**: a static gradient placeholder frame stands in for a real
  video — there is no video player, no CMS-backed story content, and no
  external media URL. This is deliberate: the demo must never depend on a
  media asset resolving over conference Wi-Fi.
- **Continue**: a conceptual 3-node diagram (Story → Reflection → Living
  World), not the real, production `/continue` route. The production
  `/continue` (`app/continue/page.tsx`) requires a signed HMAC "receipt"
  token from the real onboarding flow and is untouched by this demo.
- **Practice**: a simple breathing-circle ritual with a "Begin/Complete"
  toggle — not the real practice content at `/practice/[id]`.
- **Echo**: shows the locally-chosen reflection word framed as "becoming"
  a persistent Echo. It is not wired to `packages/living-echo` (a
  types-only stub in the real codebase) or to any account-scoped Echo
  persistence — nothing is written to a database.
- **Living Forest**: no game engine, no 3D, no procedural generation — a
  hand-built CSS/SVG scene communicating the concept, explicitly labeled
  as such.
- **Living Worlds**: five named worlds shown as static cards (story, world
  name, theme) — no world is playable from this step, and no product or
  route backs any of them yet.
- **Platform Architecture**: a static concept diagram of the shared engine
  (AvatarK → Living Worlds → GameK → PrometheusK) — not a live systems
  diagram, not linked to any real product page, and none of GameK's four
  named dimensions (FlowK, PathK, GeometryK, ChronicleK) are wired to
  actual product routes from here.

## Conference operating instructions

- Open `/ai4` before the audience arrives; leave it on step 1 (Restart
  Demo resets to step 1 if needed between attendees).
- Use `→`/`←` or the on-screen Previous/Next to advance — no clicking into
  browser chrome required.
- If the browser is refreshed mid-demo (e.g. accidental keypress), it
  resumes at the same step and keeps the chosen reflection — no need to
  restart from scratch unless you want to reset for the next visitor.
- Between attendees, click "Restart Demo" to clear the stored reflection
  and return to step 1.
- No login, no network dependency beyond the initial page load — safe to
  run on unreliable conference Wi-Fi, and safe to leave running
  unattended between conversations.
