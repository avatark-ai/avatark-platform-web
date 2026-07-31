# Appearance & Theme Contract

Package: `@avatark/appearance` (`packages/appearance/`). Contract + registry
only; not wired into `app/globals.css` or `account_preferences.theme` yet
(see "Open item" below).

## The two axes are separate on purpose

- **Appearance mode** — a user preference: `system | dark | light |
  high-contrast`. Resolved independently of which product is mounted.
- **Product accent** — controlled by the mounted product (gold, amber/fire,
  etc). Resolved independently of the user's appearance mode.

A mode-resolution helper (`resolveConsumerMode`) never takes a product id.
An accent lookup (`getProductAccent`) never takes a user's mode. Tests
(`helpers.test.ts`) assert both independently.

## Appearance mode registry

| Mode | State | Consumer-facing today? |
|---|---|---|
| `system` | `complete` | Yes |
| `dark` | `complete` | Yes |
| `light` | `internal` | No — not yet functionally complete |
| `high-contrast` | `planned` | No |

`getConsumerFacingModes()` returns only `complete` entries. A stored
preference referencing `light`/`high-contrast` (e.g. a stale DB value) is
never rendered as-is — `resolveConsumerMode()` falls back to `system`.

## Product accent tokens

| Product | Accent |
|---|---|
| AvatarK | gold |
| PrometheusK | amber/fire |
| GameK | gold/electric |
| ArenaK | recognition |
| StreamK | media |
| CinemaK | cinematic |
| StudioK | creation |
| Atlas | knowledge/research |
| SetpointK | physiological/intelligence |

These are design-token *names*, not CSS values — actual custom-property
definitions are a product-app concern.

## Reduced motion

`AppearancePreference.reducedMotion` is a boolean, independent of `mode`,
respected regardless of which mode is active. (Note: today's real
`account_preferences` API returns a hardcoded `reducedMotion: false` with no
persistence — see audit §12. This package defines the contract; wiring a
real persisted value is a migration-phase concern.)

## What this package does NOT own

Typography, spacing, card hierarchy, borders, and focus/disabled/error/
loading states are owned by `packages/account` (account shell) and
`packages/auth-ui` (sign-in UI), not here — this package only resolves
*which* mode/accent applies, not how either is rendered.

## Avoiding hydration flashes

`HYDRATION_SAFE_SCRIPT_SNIPPET` is a ready-to-inline `<script>` string that
sets `data-appearance` on `<html>` before first paint, reading only
`localStorage`/`matchMedia` — no React, no network call, so there is no
signed-in/signed-out or light/dark flash on first render. Inlining it into
the root `app/layout.tsx` `<head>` is a Part 16 migration step, not done by
this package.

## Open item for later migration

`account_preferences.theme` is already persisted per-user (defaults to
`'dark'`) but nothing reads it today (audit §17); `app/globals.css` has only
one OS-driven `@media (prefers-color-scheme: dark)` switch. Wiring the
stored preference through `resolveConsumerMode` and applying
`HYDRATION_SAFE_SCRIPT_SNIPPET` is a Part 16 (AvatarK reference migration)
concern.
