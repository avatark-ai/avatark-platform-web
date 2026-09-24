# WORLDK-P11B — Platform schema security audit and migration 038

Date: 2026-09-24. Target: `avatark-platform-preview` (ref `gxjdbfpyyrycvqzozyty`),
the dedicated NON_PRODUCTION / PREVIEW_TEST Supabase project created for P11B.
Production (`avatark-platform-test`, ref `hapoerzbcnagyfafqojg`, the backend of
next.avatark.ai despite its name) was not connected to or modified.

## Migration state of the preview project

`public.schema_migrations` (the ledger of `supabase/scripts/run-platform-migrations.js`):
001–035, 037, 038. **036 is intentionally absent.**
`036_certification_authority.sql` belongs to the separate narrative-ir-adapter
lineage, which has not landed. Nothing in 037 or 038 depends on it
(037 needs only `auth.users` and pgcrypto from 001). When 036 lands, the platform
runner will apply it in list order; `supabase db push` would need `--include-all`.

## Why the exposures existed

On a real Supabase project, default privileges grant `anon` and `authenticated`
full table privileges and EXECUTE on every new object in `public`. The authority
model therefore rests entirely on RLS, policy role scoping and explicit
`REVOKE ... FROM anon, authenticated`. M09 proved 037 on vanilla Postgres, where
those default grants do not exist, so the gaps below were invisible there.

## Classification (after 038)

| Class | Objects | Evidence |
|---|---|---|
| INTENDED_PUBLIC | `storage` bucket `avatars` (public read, owner-folder write) | 019 comments. Proven: anon reads a public object; a user cannot write into another user's folder. |
| INTENDED_AUTHENTICATED, shared read | `world_instances`, `durable_world_shared_state`, `living_entity_state`, `world_checkpoints`, `world_system_events`, `world_leases`, `world_lifecycle`, `entity_behavior_state`, `group_state`, `world_events`, `entity_memory_entries`, `historical_markers`, `encounter_history_entries`, `relationships`, `group_memberships`, `familiarity_states`, `home_ranges`, `separations`, `place_rhythm_profiles`, `encounter_records`, `adaptation_pressure`, `adaptation_effects`, `canonical_event_projection_state` | 026–032, 034 comments: "read-only for authenticated clients". Policies were `TO public`; 038 scopes them `TO authenticated` (predicate unchanged). |
| INTENDED_AUTHENTICATED, owner-scoped | `profiles`, `account_preferences`, `privacy_settings`, `context_snapshots`, `context_history`, `experience_events`, `journey_states`, `journey_transitions`, `capability_grants`, `organization_members`, `organizations` (member), `platform_roles`, `product_access`, `participation_records`, `private_reflections`, `visitor_world_memory`, `world_visitor_continuity` (read own) | `auth.uid()` predicates; anon evaluates to NULL and gets no rows. Unchanged. |
| SERVER_ONLY | `territory_claims` (new in 038), `organization_invitations`, `platform_audit_events`, `visitor_canonical_event_witness`; functions `record_world_confirmed_entry`, `record_world_leave` | RLS on with no client policy (or `USING (false)`). 037: writers "executable by service_role alone". 033 documents no client path and no code reads `territory_claims` through Supabase. |
| MIGRATION_INTERNAL | `schema_migrations` + its sequence; trigger functions `handle_new_platform_user`, `update_updated_at_column` | Runner connects as table owner. Trigger functions return `trigger` and cannot be invoked through `/rest/v1/rpc`, so their default EXECUTE grant is not an exposure; left unchanged. |
| AMBIGUOUS | none | — |

## Findings fixed by 038

1. `territory_claims`: no RLS, anon SELECT/INSERT/UPDATE/DELETE. Now RLS on, all privileges revoked from anon/authenticated.
2. `schema_migrations`: anon/authenticated read/write. Now RLS on and revoked (sequence too).
3. `record_world_confirmed_entry` / `record_world_leave` (SECURITY DEFINER): any anon-key holder could record entry/leave for an arbitrary subject via RPC. EXECUTE is now revoked from anon/authenticated; service_role still has it.
4. 23 shared world-state read policies admitted anon, contrary to their documented intent. Now `TO authenticated`.

## Proof (preview only)

- 038 applied cleanly; a second runner pass skips 001–038 on checksum match.
- Remote PostgREST/Auth exposure test, 23/23. Callers: anon key, a signed-in preview test user, service role. Checks:
  - anon `territory_claims` SELECT/INSERT/UPDATE/DELETE, `schema_migrations` SELECT, and both RPCs are denied. anon reads of `world_instances`, `profiles` and `world_visitor_continuity` return no rows.
  - Signed-in user reads the seeded `world_instances` row. Their profile row exists (auth trigger) and is the only row visible. They can update it. `territory_claims`, `schema_migrations` and the RPC are denied.
  - service_role entry/leave succeed. The signed-in user reads only their own continuity row. The ledger refuses a tick earlier than last-seen (037 invariant).
- Storage: anon public avatar read 200. A write into another user's folder is refused.
- `npm test`: 1807 total, 1806 pass, 0 fail, 1 skip (the Postgres suite without a DB URL). The Postgres ledger suite on a disposable `postgres:16` (removed afterwards): 10/10. Together that is P11's 1816. `tsc --noEmit` clean.
- Audit seed rows were deleted afterwards. Two preview-only test identities remain
  (`p11b-visitor-{a,b}@avatark-preview.test`, `user_metadata.p11b_preview_test = true`).

## Residual notes

- Every future public table or function on Supabase needs explicit RLS and `REVOKE EXECUTE ... FROM anon, authenticated`. The default grants will otherwise reintroduce this class of exposure. Nothing in the runner checks this today.
- 038 references tables from 026–037, so it can only run after them. Production's documented ledger stops at 019/020; 038 is not a production change.
- The `avatars` bucket has no size or MIME limit. Pre-existing, out of 038's scope.
