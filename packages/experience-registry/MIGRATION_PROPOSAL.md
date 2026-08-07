# Experience Registry — persistence migration proposal (NOT APPLIED)

Status: **proposal only**. `InMemoryExperienceEventRepository` (`src/inMemoryRepository.ts`)
is the only implementation that exists today, and it is process-local and
non-durable. The SQL below (`supabase/migrations/023_experience_events.sql`)
is a concrete starting point for review, not a decision -- it has not been
run against any database, and is not wired into
`supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER`.

## Why propose a schema now instead of just shipping the in-memory version

The mission calls for a "reference in-memory implementation plus clear
migration proposal" specifically so persistence gets designed alongside the
contract, without either silently creating schema or leaving the shape of
"what would this look like as a real table" unspecified for whoever picks
this up next.

## Design

One table, `experience_events`, one row per `ExperienceEvent`:

- `user_id` -- the row owner (`ExperienceActor.userId`). Everything is
  scoped by this column, mirroring `ExperienceEventRepository`'s API shape
  (every method takes a `userId`).
- `type`, `source_product_id`/`source_component`, `target_type`/`target_id`,
  `metadata` (jsonb), `occurred_at`, `recorded_at`, `correlation_id`,
  `session_id` -- direct columns for each `ExperienceEvent` field, flattening
  the nested `source`/`target`/`actor` objects rather than storing them as
  nested jsonb, so they're indexable and queryable with plain SQL.
- `schema_version` -- carried straight through from the application-level
  stamp, so a future reader can special-case old rows without a backfill.
- Two `CHECK` constraints mirror `src/validation.ts`'s type-format and
  metadata-size rules at the database layer, as defense-in-depth against a
  future writer that bypasses `ExperienceRegistry.recordEvent()`.
- RLS: owner-scoped `SELECT` and `INSERT` policies only. No `UPDATE`, no
  `DELETE`, for anyone (including the owner) -- with RLS enabled and no
  policy for an operation, Postgres denies it. This is where "immutable
  after write" and "no update()/delete() in the repository interface"
  become an actual database-enforced guarantee instead of an
  application-level convention that a bug or a future contributor could
  quietly break.
- No admin-read policy. Per the mission, administrative access "must be
  separately privileged" -- that's a distinct, separately-reviewed decision
  (most likely a service-role path that bypasses RLS entirely, matching
  `platform_audit_events`' existing precedent), not something to add
  speculatively here.

## Open questions for whoever reviews this

1. **Retention.** This proposal has no TTL/archival story. An
   ever-growing per-user event log is the expected shape for a "digital
   twin"-style substrate, but someone should decide on a retention or
   partitioning policy before real traffic hits this table.
2. **Correlation lookups across users.** `findByCorrelationId` is
   user-scoped in the application API (by design, for isolation), but a
   single correlation id (e.g. one game session) could in principle span
   multiple users. If a legitimate cross-user correlation use case shows up
   later, it needs its own reviewed access path -- not a relaxation of the
   per-user RLS policy above.
3. **Write path.** Nothing in this proposal assumes events are written
   directly from browser clients with the user's own JWT (the RLS policy
   would allow it) versus always going through a server-side API route.
   Given `no secrets`/`no raw auth tokens` and the metadata validation
   living in `ExperienceRegistry.recordEvent()`, routing all writes through
   a server-side call so that validation always runs is the safer default,
   but that's an application-wiring decision for whoever implements the
   Postgres repository, not something this migration enforces.
4. **Numbering collision.** This file is `023_experience_events.sql` on
   `feature/experience-registry`. The sibling `feature/experience-runtime`
   branch independently added its own `023_journey_states.sql` off the same
   `feature/avatar-platform-rc3` base. Whichever branch merges to `rc3`
   first keeps number 023; the other's migration gets renumbered as part of
   that merge -- there is no collision today because neither branch is
   merged yet, but this needs to be resolved at merge time, not before.

## What would still need to be built, and isn't, in this proposal

A `PostgresExperienceEventRepository` implementing
`src/repository.ts`'s `ExperienceEventRepository` interface against this
schema. Not included here -- the mission's persistence ask is the interface
plus a reviewed proposal, not a live Postgres client.
