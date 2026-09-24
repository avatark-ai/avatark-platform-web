# WORLDK-P11B — Vercel configuration-diff proof

Date: 2026-09-24. Vercel project `avatark-platform-web` (`prj_RPbcDpUZC8nqnxCKscoct0k5pe0A`).
No secret values appear in this document.

## Sequence deviation (recorded, not rewritten)

- **P11B_SEQUENCE_DEVIATION:** the branch `feature/worldk-p11b-platform-preview-provisioning` was pushed (`cba6989`, 2026-09-24T02:04:25Z) before this proof. Vercel rejects branch-scoped env vars for a branch that does not exist on GitHub (400 "Branch not found").
- **IMPACT:** no deployment, no production cross-wiring, no production mutation. Vercel `deployments?branch=<P11B>` returned 0; the newest project deployment at the time was 01:15:43Z from another lane.
- **CORRECTION:** the pushed commit itself disabled deployments for this branch (`vercel.json` `git.deploymentEnabled[<P11B branch>] = false`) before any preview environment configuration existed.

## Diff

Snapshot of env metadata (id, key, target, type, gitBranch, createdAt, updatedAt, configurationId) before and after:

| Set | Entries | Metadata sha256 (16) before | after |
|---|---|---|---|
| All pre-existing entries | 12 | `555b259444967169` | `555b259444967169` |
| Entries targeting Production | 5 | `0aff00046fd655d3` | `0aff00046fd655d3` |

Added: exactly four entries, each with `target = [preview]`, `gitBranch = feature/worldk-p11b-platform-preview-provisioning`, `type = encrypted`:

| Key | Verified value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gxjdbfpyyrycvqzozyty.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | equals avatark-platform-preview anon key; JWT `ref = gxjdbfpyyrycvqzozyty`, `role = anon` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | equals avatark-platform-preview publishable key |
| `WORLD_CONSUMER_MODE` | `FIXTURE_PREVIEW` |

Deliberately **not** added: `WORLD_CONSUMER_LEDGER_DATABASE_URL`, meaning the Preview uses the in-memory ledger (owner decision); `SUPABASE_SERVICE_ROLE_KEY`, whose admin surfaces degrade to "unavailable".

Effective P11B Preview resolution: every Supabase variable resolves to the branch-scoped value. The only variable still inherited from the unscoped Preview set is `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`, a non-Supabase feature flag. Production resolves only to its 5 unchanged entries, and `https://next.avatark.ai` public JS embeds only `hapoerzbcnagyfafqojg`.

CONFIGURATION_DIFF = PASS.

## Protection access

No project-wide Protection Bypass for Automation is created for P11B. Vercel scopes it to the whole project, which is broader than P11B. Remote certification uses a temporary shareable-link bypass scoped to the P11B deployment alias. It is revoked after the proofs.
