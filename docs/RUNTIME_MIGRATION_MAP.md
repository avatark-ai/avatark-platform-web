# Runtime Migration Map

Final state of every Supabase migration touched by the Runtime Kernel Integration
(Sprint 3). **Nothing here has been applied to any database.** This document
records what was *renumbered* and *registered*, not what was *run*.

## The collision this map resolves

Three branches independently created a migration numbered `023` off the identical
`feature/avatar-platform-rc3` base (verified: all three shared merge-base `dc6bee2`).
No foreign keys exist between any of the three schemas — each references only
`auth.users(id)` — so the renumbering below is filename/ordering hygiene, not a
correctness fix.

## Final numbering

| Number | Filename | Origin branch | Tables | Registered in `MIGRATION_ORDER`? |
|---|---|---|---|---|
| 023 | `023_experience_events.sql` | `feature/experience-registry` | `experience_events` | ✅ Newly registered this sprint (was previously proposal-only, unregistered) |
| 024 | `024_context_snapshots.sql` (renamed from `023_context_snapshots.sql`) | `feature/context-runtime` | `context_snapshots`, `context_history` | ✅ Already registered; entry's filename updated |
| 025 | `025_journey_states.sql` (renamed from `023_journey_states.sql`) | `feature/experience-runtime` | `journey_states`, `journey_transitions` | ✅ Newly registered this sprint (was previously unregistered) |

Why `023` kept its number and the other two moved: per
[MERGE_PLAYBOOK.md](./MERGE_PLAYBOOK.md) Part 1, `experience-registry` merged first
among the three migration-bearing branches (3rd overall in the merge order —
after `narrative-runtime` and `living-world-runtime`, which carried no migrations
at all), so its `023` became authoritative; `context-runtime` (4th) and
`experience-runtime` (5th) were renumbered at their respective merge points.

## Full migration sequence (001–025), for context

`019_avatar_storage.sql`, `020_capability_grants.sql`,
`021_organization_invitation_acceptance.sql`, and
`022_profile_location_normalized.sql` are **preserved exactly** — diffed
byte-for-byte against `feature/avatar-platform-rc3` and confirmed identical.
Migrations `020` and `022` were already unapplied before this sprint (per prior
session records) and remain unapplied; this sprint does not change that status.

```
001_extensions.sql                              (applied, pre-existing)
...                                              (002-018, applied, pre-existing)
019_avatar_storage.sql                           (applied, pre-existing, unchanged)
020_capability_grants.sql                        (UNAPPLIED, pre-existing, unchanged)
021_organization_invitation_acceptance.sql       (applied, pre-existing, unchanged)
022_profile_location_normalized.sql              (UNAPPLIED, pre-existing, unchanged)
023_experience_events.sql                        (UNAPPLIED -- new this sprint's reconciliation)
024_context_snapshots.sql                        (UNAPPLIED -- renamed from 023 this sprint)
025_journey_states.sql                           (UNAPPLIED -- renamed from 023 this sprint)
```

**Unapplied backlog after this sprint: five migrations deep** (`020`, `022`,
`023`, `024`, `025`). This is a real, growing gap this sprint inherits but does
not fix — recommend a dedicated "apply the backlog" pass, with real database
access, as an explicit prerequisite before Sprint 4 (see
[RUNTIME_KERNEL_MERGE_REPORT.md](./RUNTIME_KERNEL_MERGE_REPORT.md)'s risks section).

## Verification performed this sprint

- `ls supabase/migrations/` — 25 files, numbered `001`–`025`, no gaps, no duplicate
  numbers, no filename collisions.
- Every renamed file's own internal header comment was checked for stale
  self-references (e.g. "migration 023's context_snapshots table") and updated —
  covered files: `023_experience_events.sql`'s own header,
  `lib/experienceRuntime/supabaseJourneyRepository.ts`,
  `lib/context/supabaseContextRepository.ts`,
  `packages/experience-registry/MIGRATION_PROPOSAL.md`.
- `supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER` array updated to
  list all three (`023`, `024`, `025`) in that order, immediately after `022`.
- Confirmed (unchanged from prior sessions) that no `PLATFORM_DATABASE_URL` is
  configured anywhere reachable from this repo — registering a migration in
  `MIGRATION_ORDER` does not cause it to run; nothing in this repo auto-applies
  migrations on any trigger.
- No `git apply`, `psql`, or Supabase CLI migration-apply command was run at any
  point during this sprint.

## What Sprint 4 (or whoever has database access) still needs to do

1. Decide whether to apply the `020`/`022` backlog before or together with
   `023`/`024`/`025` — this sprint takes no position on ordering beyond "no FK
   dependency forces an order among `023`/`024`/`025` themselves."
2. Confirm `experience_events`, `context_snapshots`/`context_history`, and
   `journey_states`/`journey_transitions` don't collide with any table name
   already present in whichever real database this eventually targets.
3. Only then run `supabase/scripts/run-platform-migrations.js` against a real,
   reviewed `PLATFORM_DATABASE_URL` — a deliberate, explicit action, never
   automatic.
