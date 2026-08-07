# Merge Playbook — Runtime Kernel Integration

**No branch has been merged. No migration has been applied.** This document prepares the merge —
exact order, exact conflicts, exact resolution steps, exact renumbering — so that when merging is
authorized, it's mechanical rather than exploratory. Source of truth for the underlying facts:
[PLATFORM_INTEGRATION_SPRINT_1.md](./PLATFORM_INTEGRATION_SPRINT_1.md).

All five branches share the identical merge-base (`dc6bee2`, the tip of
`feature/avatar-platform-rc3` at the time of the Sprint 1 audit) — true siblings, verified no
drift between them.

---

## Part 1 — Migration Reconciliation

### The collision, restated precisely

Three branches independently created a migration numbered `023` off the same base:

| File | Branch | Tables | Foreign keys |
|---|---|---|---|
| `023_experience_events.sql` | experience-registry | `experience_events` | `auth.users(id)` only |
| `023_context_snapshots.sql` | context-runtime | `context_snapshots`, `context_history` | `auth.users(id)` only |
| `023_journey_states.sql` | experience-runtime | `journey_states`, `journey_transitions` | `auth.users(id)` only |

No foreign keys exist *between* these three schemas. Renumbering is a pure filename/ordering
exercise — there is no data-dependency reason one must apply before another.

### Final renumbering (locked to the merge order in Part 2)

| Final number | Original file | Action at merge time |
|---|---|---|
| `023` | `023_experience_events.sql` | No rename — merges first among the migration-bearing branches, keeps its number. **Add** it to `supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER` (currently not registered by this branch at all). |
| `024` | `023_context_snapshots.sql` → `024_context_snapshots.sql` | Rename file; update its own header comment's self-reference if any; update its existing `MIGRATION_ORDER` registration's filename to `024_context_snapshots.sql`. |
| `025` | `023_journey_states.sql` → `025_journey_states.sql` | Rename file; update header comment; **add** to `MIGRATION_ORDER` (currently not registered at all). |

### Pre-existing backlog this plan inherits (not caused by it)

`020_capability_grants.sql` and `022_profile_location_normalized.sql` are already unapplied on
`feature/avatar-platform-rc3`, per prior-session records. After this plan's three renumbered
migrations land, the unapplied backlog reaches five: `020 → 022 → 023 → 024 → 025`. **This plan
does not apply any of them** — applying the backlog is a separate, explicit prerequisite for
whoever has real database access, to be done before Sprint 3, not as part of this integration pass.

### Safe application order, once authorized

`020 → 022 → 023 (experience_events) → 024 (context_snapshots) → 025 (journey_states)`. Order among
the three new ones is for traceability only (matches merge order below) — no correctness
dependency exists between them.

---

## Part 2 — Merge Order

### Blast-radius ranking (measured from actual diffs, not estimated)

| Branch | Shared files touched | Migrations | Touches already-live shared code |
|---|---|---|---|
| narrative-runtime | `package.json`, `pnpm-lock.yaml`, `scripts/build-packages.mjs` | 0 | No |
| living-world-runtime | `package.json`, `pnpm-lock.yaml`, `scripts/build-packages.mjs` | 0 | No |
| experience-registry | `package.json`, `pnpm-lock.yaml`, `scripts/build-packages.mjs` | 1 (`023`) | No |
| context-runtime | + `scripts/pack-packages.mjs`, `supabase/scripts/run-platform-migrations.js` | 1 (`023`→`024`) | **Yes** — `lib/account/adapters.ts`, 2 new API routes |
| experience-runtime | + none beyond package.json/lockfile | 1 (`023`→`025`) | **Yes** — `app/account/page.tsx`, 1 new API route |

### Recommended order: 1) narrative-runtime → 2) living-world-runtime → 3) experience-registry → 4) context-runtime → 5) experience-runtime

---

### 1. `feature/narrative-runtime`

- **Prerequisites:** none.
- **Expected conflicts:** none at the code level (adds only new files under `packages/narrative-runtime/`). Textual, trivially-resolved additions in three shared files:
  - `package.json` — new `"@avatark/narrative-runtime": "workspace:*"` line in `dependencies` (insert alphabetically between `@avatark/motion` and `@avatark/notifications` or wherever the current list places it) + append its 3 test files to the single-line `test` script string.
  - `pnpm-lock.yaml` — new workspace-link entries.
  - `scripts/build-packages.mjs` — new `"narrative-runtime"` entry in the `BUILD_ORDER` leaves array.
- **Resolution steps:**
  1. Merge normally — first branch in, nothing to conflict against.
  2. Run `pnpm install` to regenerate `pnpm-lock.yaml` from scratch rather than trust the merge's textual result.
  3. Run the package's own tests (`pnpm --filter @avatark/narrative-runtime test`) and the root `pnpm test`.
- **Estimated effort:** **XS** (under 15 minutes; no functional verification needed beyond automated tests, since nothing consumes this package yet).

### 2. `feature/living-world-runtime`

- **Prerequisites:** (1) merged, so `scripts/build-packages.mjs` and `package.json` already carry narrative-runtime's additions.
- **Expected conflicts:** same three shared files as (1), now resolving against narrative-runtime's already-merged lines instead of zero — still line-level, non-overlapping additions (different package name, different line), so a standard merge resolves cleanly without manual edits in the common case; verify by eye that both entries survive.
- **Resolution steps:** identical to (1) — merge, regenerate lockfile, run tests.
- **Estimated effort:** **XS**.

### 3. `feature/experience-registry`

- **Prerequisites:** (1) and (2) merged.
- **Expected conflicts:** same three shared files, plus a **new** file `supabase/migrations/023_experience_events.sql` — no git conflict (unique filename), but this is the point where the migration-numbering decision (Part 1) first becomes real.
- **Resolution steps:**
  1. Merge normally.
  2. Regenerate lockfile, run tests.
  3. **Register** `023_experience_events.sql` in `supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER` (not done by the branch itself — this playbook's Part 1 requires it).
  4. Do **not** apply the migration.
  5. Record the `@avatark/timeline` reconciliation question (RUNTIME_GLOSSARY.md) as a follow-up — not required to unblock this merge, but this is the natural checkpoint to log it.
- **Estimated effort:** **S** (adds the migration-registration step beyond (1)/(2), still no functional/UI verification since nothing consumes this package yet).

### 4. `feature/context-runtime`

- **Prerequisites:** (1)–(3) merged.
- **Expected conflicts:**
  - Same three shared files, now resolving against three prior branches' entries — mechanically the same as before, just more lines to eyeball.
  - `scripts/pack-packages.mjs` — new entry, first branch in this batch to touch this file, no conflict.
  - `supabase/migrations/023_context_snapshots.sql` — **rename to `024_context_snapshots.sql` before or during this merge**, per Part 1.
  - `supabase/scripts/run-platform-migrations.js` — this branch already registers its migration; **update the registered filename** from `023_context_snapshots.sql` to `024_context_snapshots.sql` after the rename, and make sure its entry comes after `023_experience_events.sql`'s entry (added in step 3) in `MIGRATION_ORDER`.
  - `lib/account/adapters.ts` — **the one file in this entire batch with real conflict risk against work *outside* this batch of five**, since this file is shared, live account-surface code other workstreams also touch. Not a conflict against any of the other four runtime branches (none of them touch this file), but verify against current `main`/`rc3` state at merge time, not just against the other four.
- **Resolution steps:**
  1. Rename the migration file and update its internal header comment before merging (or as the first commit after merging, before anything else touches it).
  2. Merge, regenerate lockfile.
  3. Diff `lib/account/adapters.ts` against the current tip of whatever branch this is merging into — confirm no other in-flight change has touched the same lines.
  4. **Functional smoke test required** (not just automated tests): sign in, hit `/api/account/context` and `/api/account/context/history`, confirm `CurrentContextCard` on the account page renders real data instead of "Not active" for the four fields it maps.
  5. Cross-check against RUNTIME_GLOSSARY.md's "Journey" finding — `CurrentContextState.journey` is about to start reflecting `currentNarrativeId` data; confirm this is still the intended mapping before merging, since a differently-scoped change elsewhere could have altered `CurrentContextState`'s shape since Sprint 1's audit.
- **Estimated effort:** **M** (half a day, mostly the functional smoke test and the live-file diff check, not the merge mechanics themselves).

### 5. `feature/experience-runtime`

- **Prerequisites:** (1)–(4) merged.
- **Expected conflicts:**
  - Same shared files, resolving against four prior branches' entries.
  - `supabase/migrations/023_journey_states.sql` — **rename to `025_journey_states.sql`**, per Part 1.
  - `supabase/scripts/run-platform-migrations.js` — this branch does **not** currently register its migration at all; **add** the entry (as `025_journey_states.sql`), after `024`'s entry.
  - `scripts/build-packages.mjs` — this branch is the **only one of the five not already registered** in `BUILD_ORDER` (a real, pre-existing gap, not something the merge itself causes) — **add** `"experience-runtime"` to the leaves array as part of this merge, or `pnpm build:packages` will continue silently skipping it forever.
  - `app/account/page.tsx` — same live-file risk profile as `context-runtime`'s `adapters.ts` in step 4: no conflict against the other four branches (none touch this file), but check against anything else that's landed on this file outside this batch since Sprint 1's audit.
- **Resolution steps:**
  1. Rename the migration file, update header comment.
  2. Add the missing `build-packages.mjs` registration.
  3. Merge, regenerate lockfile.
  4. Diff `app/account/page.tsx` against current tip for out-of-batch changes.
  5. **Functional smoke test required:** sign in, open the account page's new "Journey" section, confirm `/api/account/journey` GET/POST round-trips (start → completeEpisode → progress bar updates).
  6. Since this merge lands right after `context-runtime`'s (step 4), and both touch the account page area, do a combined visual pass: confirm the "Journey" tab and the now-live `CurrentContextCard` don't visually or semantically contradict each other on the same page (the "three Journeys" naming risk from RUNTIME_GLOSSARY.md is most visible exactly here).
- **Estimated effort:** **M** (similar to context-runtime — the build-packages.mjs fix and the combined visual pass add slightly more than a mechanical merge, but no new category of risk).

---

## Part 3 — What must NOT happen during any of the five merges above

Restating this sprint's own constraints, since a playbook is exactly the kind of document someone
might later execute without re-reading the mission: **do not apply any migration as part of any of
these five merge steps.** "Register in `MIGRATION_ORDER`" and "rename the file" are preparation
steps, not application. Actually running `supabase/scripts/run-platform-migrations.js` against a
real database is a separate, explicit, later action requiring its own sign-off.
