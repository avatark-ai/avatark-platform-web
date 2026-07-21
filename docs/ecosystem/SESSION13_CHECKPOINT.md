# Session 13 — Phase 5, RC1 Implementation, Iteration 4 Checkpoint

Date: 2026-07-21. Repository: `avatark-platform-web`, branch
`feature/avatar-home-registry-navigation`.

---

## What this session was

RC1 Iteration 4, "Avatar Platform Return Journey": implement the
Platform-side experience for users returning from products, so Avatar
Platform feels like the ecosystem's front door rather than a page a
visitor passes through once. Scoped entirely to this repository — no
changes to GameK, PrometheusK, Arena, or Stream; no new protocol, no
Timeline, no Recommendations, no Events, no analytics, no notifications.

## What was produced

Two documents plus real code changes, all in this repo:

1. `docs/ecosystem/RC1_PLATFORM_RETURN_JOURNEY.md` — full report:
   Implemented, Verified, Remaining UX gaps, Remaining RC1 blockers.
2. This checkpoint.
3. Code: fixed an inverted status message and a real sequencing-gap bug
   in the home page's returning-visitor banner, extracted the shared
   "what's next" decision so the home page and `/journey/today` no longer
   carry two independently-drifting copies of it, fixed a product-naming
   inconsistency ("Prometheus" vs. the registry's "PrometheusK"), and
   added a small test for the extracted function. All four quality gates
   re-run clean: `tsc`, `eslint`, 106/106 tests (up from 102), 33-route
   build.

## The two real defects found and fixed

1. **Inverted copy**: `HomeContinuity.tsx` told a visitor who had
   *completed* their practice that they had one "in progress" — backwards.
2. **A genuine sequencing gap**, found by tracing the data flow rather
   than trusting the existing code's own branch order: a visitor who
   completes a practice and closes the tab at `/continue` (never visiting
   `/journey/today`, the only place `witness`/`intention` get persisted)
   ends up with `practiceCompletedAt` set but `witness`/`intention` still
   null — the original logic would tell that visitor to "Begin with an
   Echo" again. Fixed by checking `practiceCompletedAt` first. This bug
   predates this session (it was already inline in `TodayView` before
   being extracted) — surfaced by this session's work, not introduced by
   it.

Both are documented with the exact failure scenario in
`RC1_PLATFORM_RETURN_JOURNEY.md` and covered by a new test case each.

## What was verified but not changed

- Registry integration (Step 2): no duplicated URLs or labels found;
  Platform's own registry domain is still `null`, unchanged, not invented.
- Navigation (`SiteHeader.tsx`): already shows a real "Continue" link and
  "Account" for signed-in visitors — no defect found.
- "Return to Explore" was **not** implemented — no existing information
  ties a visitor to GameK/Explore at all (no arrival signal, no field),
  and this session's brief explicitly said to use existing information
  only. Documented honestly as a gap rather than faked.

## What was explicitly not done

- No code changed in `gamek-web`, `prometheusk-web`, `dt4m-os`, or any
  other repository. Both sibling repos' `git log` were checked this
  session and confirmed unmoved since Iteration 1 (`gamek-web` at
  `a4af327`, `prometheusk-web` at `9215de2`).
- No new protocol, field, or query param was introduced — every fix uses
  fields (`intention`, `witness`, `practiceCompletedAt`) and contracts
  (`buildContinueUrl`, `buildBorrowUrl`, the registry) that already
  existed before this session.
- No Timeline, Event Bus, Recommendations, Notifications, or Analytics
  surface was built, per this session's explicit exclusions.
- The pre-existing uncommitted edit to `docs/PLATFORM_ENTRY_EXPERIENCE_HANDOFF.md`
  and the stale untracked worktree at `.claude/worktrees/rc5-handoff-docs/`
  (both present before this session started, both noted in Iteration 1's
  own checkpoint) were left exactly as found.

## What remains open

See `RC1_PLATFORM_RETURN_JOURNEY.md`'s "Remaining RC1 blockers" in full;
unchanged from Iteration 1 and re-confirmed current this session:

1. No leg exists for a GameK-mediated visitor to return to Avatar
   Platform — confirmed at the code level that `prometheusk-web`'s
   `/run/[practiceId]` (GameK's target route) only ever offers "Return to
   GameK," never "Return to AvatarK." Not fixable from this repository
   alone.
2. Platform's own registry domain is still `null` — a deferred human
   decision, not invented.
3. GameK's handoff still resolves every visitor to the same single
   PrometheusK practice — a content-authoring gap.
4. Explore → GameK still carries no arrival signal.

Also newly named this session (Remaining UX gaps, not blockers): a
visitor who completes a practice without visiting `/journey/today` never
sees the richer completion snapshot until they do, and the banner's copy
voice is slightly more formal than the rest of the app's — both flagged,
neither fixed, to avoid scope creep beyond this iteration's brief.
