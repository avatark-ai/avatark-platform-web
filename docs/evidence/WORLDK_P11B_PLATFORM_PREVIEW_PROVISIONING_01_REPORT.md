# WORLDK-P11B-PLATFORM-PREVIEW-PROVISIONING-01 — Report

Date: 2026-09-24. Branch `feature/worldk-p11b-platform-preview-provisioning` (from P11 `b9f9b9a`).
No secret values appear in this report.

## Classification

**WORLDK_P11B_PLATFORM_PREVIEW_CERTIFIED**, with ephemeral remote continuity.

| Gate | Result |
|---|---|
| PLATFORM_PREVIEW_HTTPS | PASS |
| PUBLIC_PROJECTION_REMOTE | PASS |
| PREVIEW_AUTH_REMOTE | PASS |
| VISITOR_PROJECTION_REMOTE | PASS |
| PREVIEW_DB_REMOTE | PASS: the deployed app reads the preview DB through a verified preview session (`/api/account/profile` 200) |
| M07_CONFORMANCE_REMOTE | PASS |
| PRODUCTION_ISOLATION | PASS |
| FAIL_CLOSED | PASS |
| CONTINUITY_REMOTE | **PREVIEW_EPHEMERAL_ONLY** |
| DURABLE_RUNTIME_CONTINUITY | **NOT_YET_WIRED** |

## Environment

| | Preview (P11B) | Production |
|---|---|---|
| Supabase project | `avatark-platform-preview`, ref `gxjdbfpyyrycvqzozyty`, us-east-1, created 2026-09-24 | `avatark-platform-test`, ref `hapoerzbcnagyfafqojg`. Production despite its name: it backs `next.avatark.ai` |
| Vercel env | 4 branch-scoped Preview entries (see configuration diff) | 5 entries, metadata hash `0aff00046fd655d3` before, during and after P11B |
| Deployment | `dpl_yA9KeVgwQM2YpSDbsgEVj8JBV3Ps` from `483979e`, target preview, READY, SSO-protected | untouched |

Other Supabase projects were not touched: arenak-prod, arenak-test, streamk-test, prometheusk-test, PrometheusK, and the certification lane's avatark-cert-test and studiok-cert-test.

## Database

- **Applied migrations:** 001–035, `037_world_visitor_continuity.sql`, `038_platform_schema_security_hardening.sql`. They were applied by `supabase/scripts/run-platform-migrations.js`, which now forbids the production ref and supports `PLATFORM_EXPECTED_PROJECT_REF`.
- **036 is intentionally absent.** `036_certification_authority.sql` belongs to the separate, unlanded certification lineage. Nothing in P11B depends on it.
- **038:** see `WORLDK_P11B_SCHEMA_SECURITY_AUDIT_01_REPORT.md`. The audit found 4 classes of exposure and 0 ambiguous items. The remote exposure proof passed 23/23.
- **Test identities (preview only):** `p11b-visitor-{a,b}@avatark-preview.test`. No production identities were created.
- **Continuity rows:** 0 in `world_visitor_continuity`.

## Remote proofs (27/27)

These ran against the P11B deployment URL through a temporary deployment-scoped shareable link. The link was redeemed test-side.

- **HTTPS:** `/` returns 200 with a verified certificate. Without access it returns a 302 to Vercel SSO.
- **Public projection:**
  - `GET /api/worlds/living-forest/public-projection` returns 200, `status OK`, `worldId living-forest`, and `Cache-Control: public, max-age=0`.
  - It carries no `subjectId`, `sinceYouWereHere` or `visitorRelevance`.
  - An unknown world returns 404 `WORLD_NOT_FOUND`, which is still schema-valid.
- **Preview auth:**
  - Test user A signs in against preview Auth; the session cookie is `sb-gxjdbfpyyrycvqzozyty-auth-token`.
  - The deployed app verifies that session: `/api/account/profile` returns user A's own profile with 200, and 401 without a session.
- **Visitor projection:**
  - With A's session: 200 `OK`, `subjectId` equals A's id (derived server-side), and `Cache-Control: private, no-store`.
  - User B gets B's own `subjectId`.
  - `?subjectId=<B>` in the query string is ignored.
  - No session → 401 `UNAUTHENTICATED`. A forged session cookie → 401. POST → 405.
- **M07 v1 conformance:** the public, unknown-world, visitor (A) and anonymous responses all validate against the frozen M07 draft-07 schemas.
- **Production isolation:**
  - The preview client bundle (about 1.86 MB inspected) embeds only `https://gxjdbfpyyrycvqzozyty.supabase.co` and never the production ref.
  - No bypass or share material appears in the bundle.
  - Production JS still embeds only `hapoerzbcnagyfafqojg`.
- **Continuity:**
  - The Preview has no `WORLD_CONSUMER_LEDGER_DATABASE_URL`, per owner decision, so it uses the process-local `InMemoryContinuityLedger`.
  - No deployed route writes continuity: `record_world_*` are not exposed to WorldK or to any route.
  - The visitor relationship reads `NO_PRIOR_VISIT`, `visitCount 0`, stable across reads.
  - This is **not** durable continuity. The durable design remains evidenced by the 037 Postgres ledger suite (10/10) and the 038 remote RPC proof (service role only).

## Protection access

- **No project-wide Automation Bypass was created.** Vercel scopes it to the whole project, which is broader than P11B.
- **Temporary access:**
  - A shareable-link bypass was created on the deployment URL only, with a 2-hour TTL.
  - It was redeemed test-side into an HttpOnly `_vercel_jwt` cookie for that host.
  - The token and cookie were never printed, committed or given to browser code.
- **Revocation:**
  - After the proofs, the link was revoked: 0 entries remain, and a fresh redemption now gets a 302 to SSO with no cookie.
  - The deployment URL and the branch alias return 302 without access.
- **Residual:** the already-minted `_vercel_jwt` is a stateless JWT and stays valid until its `exp`, about 2 hours after creation. Revocation cannot cancel it. The only copy was shredded locally right after revocation.

## Sequence deviation (preserved)

- **P11B_SEQUENCE_DEVIATION:** the branch was pushed (`cba6989`) before the configuration-diff proof. Vercel requires the branch to exist on GitHub before it accepts branch-scoped env vars.
- **IMPACT:** no deployment, no cross-wiring, no production mutation.
- **CORRECTION:** the pushed commit carried a `vercel.json` deploy hold. It was removed only in `483979e`, after `WORLDK_P11B_CONFIGURATION_DIFF_01.md` was committed (`99ba002`).

## Permission-classifier denials (not worked around)

1. Creating a preview DB login role with BYPASSRLS for the ledger. The owner then chose no DB ledger credential.
2. A deployments read immediately after the premature push. It was later performed on owner instruction.

## Mutation ledger

| Scope | Mutation |
|---|---|
| PRODUCTION_DB | ZERO |
| PRODUCTION_AUTH | ZERO |
| PRODUCTION_DEPLOYMENT / Vercel production config | ZERO |
| Production DNS | ZERO |
| WorldK (`worldk-web`) | ZERO (`c4b0ab9`, clean) |
| M09 worktree | ZERO (`55a3fbe`, clean) |
| Certification lane | ZERO from P11B (its own session moved it to `4116d72` and added its own env/bypass) |
| Preview Supabase | created; migrations 001–035, 037, 038; 2 test users |
| Vercel | 4 branch-scoped Preview env entries; 1 Preview deployment; temporary shareable link (revoked) |

## Follow-ups (recorded, not solved here)

- **CERTIFICATION_BYPASS_SECRET_ROTATION_REQUIRED = YES.** P11B's session printed that lane's automation bypass secret to its transcript. It must be rotated by the owning lane.
- **M12_PLATFORM_ACCESS_MECHANISM = REQUIRES_DESIGN_DECISION.** The shareable link was for P11B certification only. Candidates: a custom non-production Platform domain, a separately isolated Vercel project, or another narrowly scoped machine-access mechanism.
- **DURABLE_RUNTIME_CONTINUITY = NOT_YET_WIRED.** A least-privilege ledger credential design is still needed. No BYPASSRLS, no broad credential.
- **Migration/security lint gate (recommendation).** Every future Supabase public table and function needs explicit authority treatment at migration time, and the runner does not enforce that. A future gate should fail a migration set that leaves:
  - a `public` table without RLS;
  - unintended `anon`/`authenticated` table grants on server-only tables;
  - SECURITY DEFINER functions executable by `anon`/`authenticated`;
  - policies scoped `TO public` where the migration documents authenticated-only access.

  The audit queries in the 038 report are a starting point. Do not redesign the migration framework inside P11B.
- **Pre-existing, out of scope:** the `avatars` bucket has no size or MIME limit.
