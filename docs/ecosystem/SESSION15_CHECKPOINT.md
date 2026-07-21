# Session 15 — RC1 Infrastructure & Configuration Checkpoint

Date: 2026-07-21. Repository: `avatark-platform-web`, branch
`feature/avatar-home-registry-navigation`.

**Naming collision, stated plainly**: `dt4m-os` already has its own
unrelated Session 15 (`docs/ecosystem/RC1_OPERATIONS_CHECKLIST.md`, "RC1
Launch Preparation," committed `86ecb3e`), following its own Session 14
(`RC1_READINESS_REVIEW_V1.md`). This session's mission — "Complete RC1
Infrastructure & Configuration" — arrived with no repository specified
and no awareness of that prior numbering; this checkpoint continues in
`avatark-platform-web`, matching Sessions 10 and 13's precedent, and is a
genuinely different piece of work from `dt4m-os`'s Session 15, sharing
only the number.

---

## What this session was

Architecture frozen, no redesign, no new platform concepts, no
governance documents — a pure configuration pass across all five
products: finalize Platform's production domain, verify the registry
against real deployments, verify all five domains, produce one
environment-variable matrix, verify Supabase/Resend/OAuth/Magic-Link/
redirect/return-origin configuration, verify Vercel projects, verify DNS
assumptions, and remove stale configuration.

## What was discovered before producing anything

Two sibling repos had moved since this program's own Session 13
checkpoint (which had confirmed them unmoved as of that session): `gamek-web`
gained `18d43f5` ("RC1 Iteration 2"), and `prometheusk-web` gained
`4ca042c` ("validate GameK launch-context handoff for RC1"). Both were
read in full before this session's own work began, so this document's
"Remaining blockers" reflects the current state, not a stale one.
`dt4m-os` had also gained two full sessions (14, 15) producing a
comprehensive Readiness Review and Operations Checklist that already
classify most of this same configuration state (CFG-1 through CFG-9) —
read in full and treated as the existing classification this document
builds the actual environment-variable matrix against, not something to
re-derive independently.

## What was produced

1. `docs/ecosystem/RC1_CONFIGURATION_MATRIX.md` — the canonical
   env-var matrix (Platform/GameK/PrometheusK/ArenaK/StreamK ×
   Development/Preview/Production), domain verification table, Vercel
   project confirmation, DNS assumptions, and Supabase/Resend/OAuth/
   Magic-Link/redirect/return-origin verification, with an explicit
   statement of what could and could not be checked from this sandbox
   (no outbound network access, no dashboard credentials for any
   external service).
2. This checkpoint.

## Real configuration changes made (all in this repo)

- **Finalized Avatar Platform's canonical production domain**:
  `https://avatark-platform-web.vercel.app` — not invented; it is the
  real, currently-linked Vercel project's domain, and independently
  corroborated by `prometheusk-web`'s own RC5 receipt allowlist, which
  already trusts this exact origin as Platform's production address
  today. Updated `packages/product-registry/src/registry.ts`'s `avatark`
  entry accordingly. **Resolves `RC1_READINESS_REVIEW_V1.md`'s CFG-1.**
- **Fixed `.github/workflows/ci.yml`**: the push trigger targeted a
  `main` branch that doesn't exist in this repo; corrected to the real
  trunk, `platform/foundation-20260714` (confirmed via `git remote show
  origin`). **Resolves CFG-4.**
- **Removed the stale git worktree** `.claude/worktrees/rc5-handoff-docs/`
  — verified clean (no uncommitted work) and verified its branch is
  already a fully merged ancestor of this branch's `HEAD` before
  removing it, via `git worktree remove` (the branch ref itself was left
  intact). **Resolves CFG-7.**
- **Corrected an overstated `.env.example` comment** claiming GameK's URL
  was "confirmed," given the four-way domain ambiguity found this
  session; added accurate, cited values for `NEXT_PUBLIC_ARENAK_URL`/
  `NEXT_PUBLIC_STREAMK_URL` (previously blank); noted that none of the
  seven cross-product `NEXT_PUBLIC_*_URL` variables in this file are
  actually read by any code path — the registry package is the real
  source of truth.
- **Independently re-confirmed ArenaK's Vercel project identity**
  (`arenak-practice`, `prj_gA1DuCrk70awTw60wAz2XkuA63OD`) via a direct
  project-ID check. **Resolves CFG-9.**

All four quality gates re-run after every change: `tsc --noEmit` clean,
`eslint .` clean, `npm test` 106/106, `npm run build` 33 routes — no
regression from any change this session made.

## A new finding not in any prior session's docs

`gamek-web`'s own committed `vercel.json` declares its Vercel project
name as `"flowk"`, targets `gamek.ai/flowk`, and sets
`X-Robots-Tag: noindex, nofollow, noarchive` plus `no-store` cache
headers — reading as a private preview deployment of one GameK
sub-experience, not a public production GameK site. This doesn't resolve
GameK's domain ambiguity (CFG-3); it adds a fourth, more concrete data
point to it, since it means this repo's own default deploy target may
not even be "GameK" as a whole. Documented in
`RC1_CONFIGURATION_MATRIX.md` §3, not acted on (a human decision, and
outside this session's write scope regardless).

## What was explicitly not done

- No architecture, identity, timeline, or event redesign.
- No new platform concept introduced.
- No governance document produced — `RC1_CONFIGURATION_MATRIX.md` is a
  configuration reference (tables, variable names, verification status),
  not a decision register or roadmap; `dt4m-os`'s existing Readiness
  Review already covers that ground and was not duplicated.
- No code, config, or file was changed in `gamek-web`, `prometheusk-web`,
  `streamk-web`, or `dt4m-os` — every finding about those repos is a read,
  cited and dated, not a write. `streamk-web`'s stale `AVATARK_JWT_SECRET`
  reference and `prometheusk-web`'s local `.env.production.inspect`
  hygiene item were both named, not touched, for exactly this reason.
- GameK's production domain was not decided — four real candidates exist,
  none independently authoritative, and picking one would be inventing a
  fact this program has consistently declined to invent.
- `NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS` was not set anywhere — doing
  so requires both the domain decision above and actual write access to
  `prometheusk-web`'s live Vercel project environment, neither available
  to this session.
- No live Supabase Auth, Google OAuth Console, or Resend dashboard was
  reachable — this session has no outbound network access and no
  credentials for any of those consoles; every verification claim in
  `RC1_CONFIGURATION_MATRIX.md` is scoped honestly to what repository
  code and config could actually show.
- Nothing was merged, per the mission's explicit "Do not merge" — this
  work stays on `feature/avatar-home-registry-navigation`.

## What remains open

Unchanged in substance from `RC1_READINESS_REVIEW_V1.md`'s CFG list,
with CFG-1, CFG-4, CFG-7, and CFG-9 now resolved by this session:

- **CFG-2** (`NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS` unset in
  production) — still open, transitively blocked on CFG-3.
- **CFG-3** (GameK's production domain) — still open; this session added
  evidence (the `vercel.json` "flowk" finding) but did not resolve it.
- **CFG-5** (no ArenaK CI/CD) — unchanged, out of this session's repo
  scope.
- **CFG-6** (`SUPABASE_SERVICE_ROLE_KEY`/`PLATFORM_DATABASE_URL` never
  configured for `avatark-platform-web`) — unchanged; provisioning this
  is an infra-access decision, not something this session could do from
  a sandbox with no credentials.
- **CFG-8** (the pending uncommitted edit to
  `docs/PLATFORM_ENTRY_EXPERIENCE_HANDOFF.md`) — left exactly as found,
  same as every prior session; this is a documentation-content decision,
  not a configuration item, and outside this session's "focus only on
  configuration" mandate.
- Two new, named-but-unactioned hygiene items (`streamk-web`'s stale
  `AVATARK_JWT_SECRET`, `prometheusk-web`'s local
  `.env.production.inspect` token) — both cross-repo, both flagged for a
  future session scoped to that repo.
