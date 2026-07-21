# RC1 Configuration Matrix

Configuration reference only. No architecture was redesigned, no new
platform concept was introduced. Repository: `avatark-platform-web`
(this repo's own configuration was corrected directly where evidence
supported it, per Tasks 1/2/8 below); every other product's
configuration below was read, not written — this document does not
modify `gamek-web`, `prometheusk-web`, `streamk-web`, or
`dt4m-os`/ArenaK.

**Relationship to existing documents**: `dt4m-os/docs/ecosystem/
RC1_READINESS_REVIEW_V1.md` (Session 14) and `RC1_OPERATIONS_CHECKLIST.md`
(Session 15, `dt4m-os`) already classified most of this same
configuration state as CFG-1 through CFG-9. This document does not
repeat that classification or its GO/NO-GO framing — it is the
"canonical environment-variable matrix" those items were classified
against, produced once here rather than re-derived per repo. Where this
session's own research closes or newly confirms one of those items, it
is marked so explicitly against its CFG number.

**A real numbering note**: this document's own checkpoint is
`SESSION15_CHECKPOINT.md`, in this repo. `dt4m-os` already has an
unrelated `docs/ecosystem/SESSION15_CHECKPOINT.md`-equivalent (Session
15, "RC1 Launch Preparation", producing `RC1_OPERATIONS_CHECKLIST.md`).
The two are different sessions in different repositories that happen to
share a session number — a naming collision, not the same work, flagged
here rather than silently left to confuse a future reader.

---

## 1. Avatar Platform canonical production domain — FINALIZED

**`https://avatark-platform-web.vercel.app`**

Not invented: this is the real, currently-live Vercel-assigned domain for
this repo's linked project, and it is already the exact origin
`prometheusk-web`'s own RC5 receipt allowlist depends on today.

- `.vercel/repo.json` (this repo, untracked, local link cache): Vercel
  project name `avatark-platform-web`, org `team_3ug0Y71nambjF31fqIVHJXLn`.
- `prometheusk-web/lib/onboarding/returnOrigin.ts`'s
  `DEFAULT_ALLOWED_ORIGINS = ['https://avatark-platform-web.vercel.app']`
  — confirmed by direct read this session — is the fallback this repo's
  own RC5 return flow already relies on when
  `ONBOARDING_ALLOWED_RETURN_ORIGINS` is unset in PrometheusK's
  environment. This is not a coincidence or a guess: it is independent
  evidence, from the other side of the trust boundary, of what this
  repo's production origin already is in practice.
- `packages/product-registry/src/registry.ts`'s `avatark` entry updated
  this session: `domain: null` → `domain: 'https://avatark-platform-web.vercel.app'`,
  with the description field citing this same evidence. **Resolves
  `RC1_READINESS_REVIEW_V1.md`'s CFG-1.**

**What is explicitly not decided here**: a custom branded domain
(`avatark.ai` / `avatark.io` — both used inconsistently across legacy
surfaces per the Wave 3 audit) remains an open naming/DNS decision this
program has repeatedly deferred to a human. `NEXT_PUBLIC_PLATFORM_ORIGIN`
stays blank by its own existing design (reserved for a future
`identity.avatark.ai` hostname split, a separate, still-deferred
architecture question) — this finalization is about the registry's
`domain` field only, not that env var, and does not reopen or resolve
the custom-domain question.

---

## 2. Product registry vs. actual deployments

| Product | Registry `domain` (before this session) | Registry `domain` (after) | Deployment evidence |
|---|---|---|---|
| `avatark` | `null` | `https://avatark-platform-web.vercel.app` | Vercel project link (§1) + independent corroboration from `prometheusk-web`'s own allowlist default |
| `prometheusk` | `https://prometheusk.avatark.io` | unchanged | `.vercel/repo.json` confirms project `prometheusk-web`; domain confirmed live via HTTP request, Wave 1 |
| `gamek` | `https://app.avatark.ai/gamek` | unchanged | **Not confirmed by this repo's own deploy config** — see §3/§7, this is the single largest remaining domain question |
| `arenak` | `https://next.arenak.ai` | unchanged | `dt4m-os/.vercel/repo.json` confirms Vercel project `arenak-practice`, directory `apps/avatark-consumer` — independently re-confirmed this session (`RC1_READINESS_REVIEW_V1.md`'s CFG-9 asked for exactly this check; **now resolved**) |
| `streamk` | `https://www.streamk.ai` | unchanged | `.vercel/repo.json` confirms project `streamk-web`; domain confirmed live via HTTP request, Wave 1 |

No other registry field was touched. The registry remains the sole
source of truth for every consumer in this repo (re-confirmed by the
same domain-literal grep Iteration 1 and Iteration 4 both ran — zero new
duplicates introduced).

---

## 3. Domain verification, all five products

| Product | Candidate domain(s) found | Verified live? | Authoritative? |
|---|---|---|---|
| Avatar Platform | `https://avatark-platform-web.vercel.app` | Real Vercel project confirmed; not independently re-curled this session (no outbound network access from this sandbox) | **Yes — finalized this session, §1** |
| PrometheusK | `https://prometheusk.avatark.io` | Yes, HTTP-confirmed, Wave 1 | Yes, unambiguous, unchanged |
| ArenaK | `https://next.arenak.ai` | Yes, HTTP-confirmed, Wave 1; Vercel project independently re-confirmed this session | Yes |
| StreamK | `https://streamk.ai` (registry: `www.streamk.ai`) | Yes, HTTP-confirmed, Wave 1 | Yes, **with one open sub-question**: the bare and `www.` forms are used inconsistently across this repo's own config (`streamk-web/.env.local.template`'s `NEXT_PUBLIC_APP_URL=https://streamk.ai` vs. the registry's `https://www.streamk.ai`) — very likely both resolve to the same site via standard DNS, but that was not independently confirmed this session (no outbound network access). Not a blocker; noted for whoever next touches DNS. |
| GameK | Four distinct candidates found, genuinely unreconciled | Partially (`app.avatark.ai/gamek` was the one HTTP-confirmed reachable in Wave 1, though its `<title>` read "AWE Platform," not GameK-branded — also unresolved) | **No — the single largest open domain question in this matrix** |

### GameK's domain candidates, side by side

| Candidate | Source | Nature |
|---|---|---|
| `https://app.avatark.ai/gamek` | Product registry (`avatark-platform-web`); `gamek-web/site.config.ts`'s `crossFaces.app` | The one HTTP-confirmed-reachable candidate (Wave 1), but titled "AWE Platform" on load, not GameK-branded |
| `https://gamek.ai/flowk` | `gamek-web/.env.example`'s `NEXT_PUBLIC_SITE_URL`; `gamek-web/vercel.json`'s `env.NEXT_PUBLIC_SITE_URL` and its own declared Vercel project `"name": "flowk"` | **New evidence this session**: this repo's own committed Vercel deployment config targets a project literally named `flowk`, serving `gamek.ai/flowk`, with `X-Robots-Tag: noindex, nofollow, noarchive` and cache-control set to `no-store` — this reads as a private/preview deployment of one GameK sub-experience (FlowK), not a public production GameK site. This does not resolve the ambiguity; it deepens it, because it means the repo's own default deploy target may not even be "GameK" as a whole |
| `https://gamek.avatark.ai` | `gamek-web/site.config.ts`'s `domainPlanned` | Explicitly self-labeled "planned" in the source comment — not a current-state claim by its own author |
| `https://gamek.ai` (bare) | `avatark-web` (legacy app) and `streamk-web/components/shared/NavFooter.tsx` | Two other repos' assumption, neither of which is GameK's own repo |

**No candidate above was picked as authoritative.** This is exactly
`RC1_READINESS_REVIEW_V1.md`'s CFG-3, restated with one new, concrete
piece of evidence (the `vercel.json` "flowk" project name and its
noindex/no-store headers) that was not cited in that review. Resolving
this requires a human decision about which of GameK's several
sub-experiences (FlowK, PathK, GeometriK, ChronicleK, the whole GameK
hub) actually deploys to which domain — not something this
configuration-only session can decide.

---

## 4. Canonical environment-variable matrix

Every environment file actually present in each repo was read directly
(never `.env.local`'s real secret *values* — only variable names, and
only from `.env.example`/`.env.*.template`/`.env.*.example`, plus
`.env.production.inspect` in `prometheusk-web`, which reads as a real
`vercel env pull` snapshot rather than a template — see §8 for the one
sensitive-content finding in that file).

**No repo has a formally distinct "Stage" environment.** All five use
Vercel's own Production vs. Preview model (a Preview deployment per
branch/PR serves the role "Stage" would); nowhere is there a third,
separately-named staging tier. The matrix below reflects that reality
rather than inventing a Stage tier none of these projects actually have.

### Avatar Platform (`avatark-platform-web`)

| Variable | Development | Preview (~"Stage") | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Own dev Supabase project, set in `.env.local` | Same project or a dedicated preview project (not confirmed from source) | Own Supabase project (production) |
| `SUPABASE_SERVICE_ROLE_KEY` | Unset | Unset | **Unset — confirmed, every environment, CFG-6.** Every cross-user Admin surface degrades to an honest "unavailable" state |
| `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` | `true` | — | `true` (default per `.env.example`) |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | `false` | — | `false` — Google OAuth is implemented (`app/auth/sign-in/page.tsx`'s `signInWithOAuth`) but stays hidden until real Supabase-side Google provider credentials exist |
| `EMAIL_SENDING_ENABLED` | `false` | — | `false` — `lib/email/sendEmail.ts` refuses to send regardless of `RESEND_API_KEY` presence until this flips |
| `RESEND_API_KEY` / `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | Unset (email sending disabled) | — | Configured in the Supabase Auth SMTP dashboard settings, not read directly by app code |
| `ONBOARDING_RECEIPT_SECRET` | Must match `prometheusk-web`'s own copy | Must differ from production | Must differ from test/preview |
| `NEXT_PUBLIC_PROMETHEUSK_URL` | `https://prometheusk.avatark.io` | same | same — **not actually read by any resolution path** (see §8); the registry is the real source |
| `NEXT_PUBLIC_GAMEK_URL` / `NEXT_PUBLIC_ARENAK_URL` / `NEXT_PUBLIC_STREAMK_URL` / `NEXT_PUBLIC_CINEMAK_URL` / `NEXT_PUBLIC_STUDIOK_URL` / `NEXT_PUBLIC_ATLAS_URL` / `NEXT_PUBLIC_SETPOINTK_URL` | Reference-only, corrected this session (§8) | — | Same — **none of these seven vars are read by any code path in this repo** |
| `NEXT_PUBLIC_PLATFORM_ORIGIN` | Blank (same-origin) | Blank | Blank — reserved for a future `identity.avatark.ai` split, a separate, deferred decision, not this session's to make |

### GameK (`gamek-web`)

| Variable | Development | Preview (~"Stage") | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://gamek.ai/flowk` (per `.env.example`) | same | Deployed value depends on which of the domain candidates in §3 is actually live — **unconfirmed** |
| `NEXT_PUBLIC_SITE_NAME` | `FlowK` | — | — |
| `PREVIEW_MASTER_PASSWORD` / `PREVIEW_SESSION_SECRET` / `PREVIEW_ACCESS_CODES` | Set locally for gated preview access (`middleware.ts` gates every route except `/api/*`) | Same mechanism | Same mechanism — this repo has **no Supabase project of its own**; access control is this password/code gate, not Supabase Auth, confirming the established "GameK is local-only/no-accounts" finding at the config level, not just the code level |
| `NEXT_PUBLIC_GA_ID` / `MIXPANEL_TOKEN` | Optional, unset by default | — | — |
| `NEXT_PUBLIC_CHRONICLEK_DEMO_SEED` | `false` (real empty Chronicle unless explicitly demo-seeded) | — | `false` |
| (implicit) PrometheusK handoff origin | `https://prometheusk.avatark.io` default, overridable via `NEXT_PUBLIC_PROMETHEUSK_URL` (`lib/gamek/prometheusk.ts`) | same | same |

**No Supabase, Resend, or Google OAuth variables exist anywhere in this
repo's env configuration** — confirmed by grep this session. GameK's
auth model is the preview-password gate above, not the Supabase
magic-link/OAuth model every other Supabase-backed repo uses.

### PrometheusK (`prometheusk-web`)

| Variable | Development | Test (`.env.test.local`) | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` (real, gitignored) | Dedicated `prometheusk-test` project — `TEST_SUPABASE_URL`/`TEST_SUPABASE_PUBLISHABLE_KEY`, explicitly never the production project | Confirmed present as variable *names* in `.env.production.inspect` (values empty in that file — see §8) |
| `DATABASE_URL` / `TEST_DATABASE_URL` | — | Transaction Pooler connection string (port 6543), test project only, explicit warning against ever pointing this at production | Present in `.env.production.inspect` |
| `ONBOARDING_RECEIPT_SECRET` | Must match `avatark-platform-web`'s copy exactly | — | Must differ from test/preview, per RC5 contract |
| `ONBOARDING_ALLOWED_RETURN_ORIGINS` | Unset → falls back to `DEFAULT_ALLOWED_ORIGINS = ['https://avatark-platform-web.vercel.app']` | — | **Unconfirmed whether explicitly set** — if unset, the hardcoded default (§1) is what's actually trusted today |
| `NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS` | Unset (dev/localhost carve-out applies unconditionally, no env var needed) | Unset | **Confirmed unset in every environment file present, including `.env.production.inspect`. This is CFG-2 — the single highest-priority configuration action item in this entire matrix.** No hardcoded fallback exists for this one (unlike the RC5 var above) — an unset value in production means the GameK "Back to GameK" CTA never renders, full stop |
| `ANTHROPIC_API_KEY` | Present (name only, empty value) in `.env.production.inspect` | — | Present |
| Vercel/CI metadata (`VERCEL_ENV`, `VERCEL_GIT_*`, etc.) | — | — | Present in `.env.production.inspect`, standard Vercel-injected variables, not application config |

### ArenaK (`dt4m-os/apps/avatark-consumer`)

| Variable | Development | Test | Production |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3100` (per `.env.example` comment) | — | `https://next.arenak.ai` — confirmed |
| `NEXT_PUBLIC_BASE_PATH` | Blank (standalone) | — | Blank unless embedded at `/arena` under a future SETPOINT host |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if the publishable-key var is absent) | `.env.local` | Separate `arenak-test` project, never production values (explicit warning in `.env.example`) | Own Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Commented out — "not used by any code path today" | — | Same |
| Local Supabase CLI config (`supabase/config.toml`) | `project_id = "avatark-consumer"` (local dev stack identifier — **not** the hosted project ref), `site_url = "http://127.0.0.1:3000"`, `additional_redirect_urls = ["https://127.0.0.1:3000"]` | — | **Not visible from this file** — production Supabase Auth redirect-URL allowlisting is configured in the Supabase cloud dashboard, which this session has no access to. This file only governs the local CLI dev stack |

**Vercel project**: `arenak-practice` (`prj_gA1DuCrk70awTw60wAz2XkuA63OD`),
directory `apps/avatark-consumer`, same org as the other four — confirmed
directly this session (resolves CFG-9).

### StreamK (`streamk-web`)

| Variable | Development | Production |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://streamk.ai` (per `.env.local.template`) | Same, or `www.streamk.ai` per the registry — see §3's open sub-question |
| `PROMETHEUSK_URL` / `NEXT_PUBLIC_PROMETHEUSK_URL` | `https://prometheusk.avatark.io` | Same |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Video hosting, unrelated to any RC1 journey | Same |
| `CONTENTFUL_SPACE_ID` / `CONTENTFUL_ACCESS_TOKEN` / `CONTENTFUL_PREVIEW_TOKEN` | CMS, unrelated to RC1 | Same |
| `RESEND_FORM_ENDPOINT` (or `RESEND_API_KEY` + `EMAIL_LIST_ID`) | Marketing email-capture — a **different purpose** than Platform's transactional Supabase-Auth-SMTP use of Resend; the two repos' Resend usage is unrelated, not a shared config item | Same |
| `NEXT_PUBLIC_POSTHOG_KEY` | "Same PostHog instance as PrometheusK" per this repo's own comment — not independently verified this session (would require reading `prometheusk-web`'s own analytics config, out of this session's config-only scope) | Same |
| `AVATARK_JWT_SECRET` | **Stale — see §8** | Stale |
| `REVALIDATE_TOKEN` | On-demand ISR revalidation, unrelated to RC1 | Same |

**No Supabase variable appears anywhere in this repo's env template** —
StreamK has no user-account system of its own in its current form,
consistent with it being a headless-CMS/video-forward product; not
independently re-confirmed beyond what the template itself states.

**Vercel project**: `streamk-web` (`prj_j3wL1lEbPBsiGPT817H1EvP6Jrky`),
same org — confirmed.

---

## 5. Supabase / Resend / Google OAuth / Magic Link / Redirect URLs / Return Origins

**What could be verified from this sandbox, and what could not, stated
plainly**: every item below is checked against real, committed
repository code and configuration files. **No live dashboard for
Supabase Auth, Google Cloud Console, or Resend was reachable from this
session** — this environment has no outbound network access and no
credentials for any of those consoles. Anything described as "confirmed"
below is confirmed at the code/config level; anything the Supabase Auth
dashboard itself controls (its own redirect-URL allowlist, its SMTP
settings, whether a Google OAuth client ID is actually registered) is
explicitly marked as **not independently verifiable from here**.

- **Magic Link**: implemented and unconditional in `avatark-platform-web`
  (`app/auth/sign-in/page.tsx`'s `supabase.auth.signInWithOtp`) —
  confirmed live code, this is the primary sign-in method. No equivalent
  exists in GameK (password-gate model instead) or in the other three
  repos' committed env templates (none reference Supabase Auth directly
  in a way this session could trace beyond ArenaK, which uses standard
  Supabase Auth per its own `config.toml`).
- **Google OAuth**: implemented but flagged off
  (`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false`) in `avatark-platform-web` —
  confirmed code exists (`signInWithOAuth` call site), confirmed no
  provider credentials are configured anywhere reachable from this
  session (per Wave 2's own finding, re-confirmed unchanged). **Whether a
  real Google Cloud OAuth client is registered for this project is not
  verifiable from this sandbox.**
- **Redirect URLs** (Supabase Auth's own allowlist of URLs it may
  redirect to post-authentication): the only *local* evidence of this
  concept is ArenaK's `supabase/config.toml`'s `site_url`/
  `additional_redirect_urls`, both set to `127.0.0.1` — **this is the
  local CLI dev stack's configuration only**, not evidence of what's set
  in any hosted Supabase project's dashboard. No other repo has an
  equivalent local file (Supabase projects configured entirely via
  dashboard, with no local `config.toml` committed). **Not independently
  verifiable for any of the five products' actual hosted Supabase
  projects from this session.**
- **Return Origins** (this program's own application-level allowlists,
  distinct from Supabase's redirect-URL concept):
  - `avatark-platform-web` ↔ `prometheusk-web` (RC5): governed by
    `ONBOARDING_ALLOWED_RETURN_ORIGINS` (`prometheusk-web`, defaults to
    `https://avatark-platform-web.vercel.app` if unset) — **has a safe
    fallback**.
  - `gamek-web` ↔ `prometheusk-web`: governed by
    `NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS` (`prometheusk-web`, **no
    fallback, confirmed unset everywhere** — CFG-2, the top action item
    in this matrix).
  - `streamk-web` ↔ `prometheusk-web`: `streamk-web/vercel.json`
    explicitly allowlists `https://prometheusk.avatark.io` in its own
    CORS headers for `/api/*` — a real, already-configured, narrower
    trust relationship (API-level CORS, not a page-redirect allowlist
    like the two above), confirmed by direct read this session, not
    previously cited in any prior session's docs found.
- **Resend**: two independent, unrelated usages exist — `avatark-platform-web`
  uses it as the Supabase Auth SMTP relay's credential (`RESEND_API_KEY`,
  gated by `EMAIL_SENDING_ENABLED=false`), `streamk-web` uses it (or
  Formspree, as an alternative) for marketing email capture. Neither
  `gamek-web` nor `prometheusk-web` references Resend anywhere in code —
  confirmed by grep this session.

---

## 6. Vercel projects

| Product | Vercel project name | Project ID | Confirmed how |
|---|---|---|---|
| Avatar Platform | `avatark-platform-web` | `prj_RPbcDpUZC8nqnxCKscoct0k5pe0A` | Local `.vercel/repo.json` link |
| PrometheusK | `prometheusk-web` | `prj_ZOjCQtLkuwhtMBOgX4lrcPsLjOAq` | Local `.vercel/repo.json` link |
| StreamK | `streamk-web` | `prj_j3wL1lEbPBsiGPT817H1EvP6Jrky` | Local `.vercel/repo.json` link |
| ArenaK | `arenak-practice` | `prj_gA1DuCrk70awTw60wAz2XkuA63OD` | Local `.vercel/repo.json` link (top-level `dt4m-os`), directory `apps/avatark-consumer` — **resolves CFG-9** |
| GameK | **Unconfirmed as a linked project** | — | Only a committed `vercel.json` declaring intended project name `"flowk"` was found — no local `.vercel/repo.json` link exists in this checkout. This is weaker evidence than the other four (a declared name in a config file vs. an actual linked project ID) — see §3's GameK domain discussion |

All four confirmed projects share one Vercel org
(`team_3ug0Y71nambjF31fqIVHJXLn`) — consistent with one team operating
all five products, matching this program's own architecture (independent
deployments, common operator).

---

## 7. DNS assumptions

Stated plainly, not re-litigated: no DNS record was queried this session
(no outbound network access). Every domain above is an assumption traced
from repository configuration and prior sessions' own HTTP-confirmed
checks (Wave 1, dated 2026-07-21), not independently re-verified live
here.

- `prometheusk.avatark.io`, `next.arenak.ai`, `streamk.ai` — all three
  have a prior, dated, direct-HTTP-request confirmation on record (Wave
  1). Treated as reliable.
- `avatark-platform-web.vercel.app` — a Vercel-assigned domain, not a
  custom DNS record at all; these are guaranteed to resolve as long as
  the Vercel project exists, which is confirmed by the project link
  itself. No custom DNS assumption is being made for Platform at all
  right now, which is in one sense the safest possible state (nothing to
  misconfigure) and in another sense exactly why no custom domain exists
  yet.
- `app.avatark.ai/gamek` vs. `gamek.ai/flowk` vs. `gamek.avatark.ai` vs.
  `gamek.ai` — **four candidate DNS names for one product, no
  resolution.** See §3.
- `streamk.ai` vs. `www.streamk.ai` — likely both resolve (a common
  apex+www DNS pattern), not independently confirmed this session.

---

## 8. Stale configuration — found and removed (this repo only)

1. **Removed**: `.claude/worktrees/rc5-handoff-docs/`, an untracked git
   worktree. Verified safe before removal: its own `git status` was
   clean (no uncommitted work), and its branch
   (`worktree-rc5-handoff-docs`, commit `ab0679c`) is already a fully
   merged ancestor of this branch's current `HEAD` — confirmed via
   `git merge-base --is-ancestor`. Nothing was lost; the branch ref
   itself was left in place, only the duplicate checked-out directory
   was removed via `git worktree remove`. This closes CFG-7.
2. **Fixed**: `.github/workflows/ci.yml`'s push trigger targeted
   `branches: [main]`, but this repo has no `main` branch (`git remote
   show origin` confirms the real trunk is `platform/foundation-20260714`).
   Corrected the branch filter to the real trunk name. This closes CFG-4.
3. **Corrected, not removed**: `.env.example`'s comment claiming GameK's
   URL was "confirmed via the cross-repo integration audit" — this
   overstated confidence given the four-way domain ambiguity in §3.
   Rewritten to state the real, current uncertainty, and to note that
   none of the seven cross-product `NEXT_PUBLIC_*_URL` variables in this
   file are actually read by any code path in this repo (the registry
   package is the real source of truth) — a genuinely stale
   *documentation* claim, now corrected rather than left to mislead a
   future reader.
4. **Named, not removed** (cross-repo, out of this session's write
   scope): `streamk-web/.env.local.template`'s `AVATARK_JWT_SECRET`
   ("Auth (shared with PrometheusK — validates user session cookies)")
   — grepped both `streamk-web` and `prometheusk-web` for any real usage
   of this variable name; **zero hits in either repo.** This reads as a
   stale or aspirational cross-product auth mechanism that was never
   actually implemented on either side. Flagged for a future
   `streamk-web`-scoped session to remove or implement — not touched
   here, since this session's write scope is `avatark-platform-web` only.
5. **Named, not removed** (cross-repo): `prometheusk-web/.env.production.inspect`
   is untracked and correctly gitignored (confirmed via `git ls-files`
   and `git log --all` — it has never been committed at any point in
   that repo's history), but it contains what reads as a real, live
   Vercel OIDC token (`VERCEL_OIDC_TOKEN`, a full JWT with plausible
   claims for the `prometheusk-web` project) sitting in plaintext on
   disk. **Not a git-exposure incident** — never tracked, never pushed —
   but worth flagging as a local hygiene item: whoever owns that
   checkout should consider deleting this Vercel-CLI-generated snapshot
   file and rotating the token if it's still valid. Not deleted by this
   session: it lives in a different repository this session was not
   asked to modify, and unilaterally deleting another repo's local
   artifact — even a stale-looking one — is exactly the kind of
   cross-repo write this program has consistently avoided without an
   explicit instruction to make it. (Two independent prior sessions —
   `prometheusk-web`'s own Session 12 and `dt4m-os`'s Session 14 — had
   already read this same file as legitimate evidence of real production
   variable names without objection, which is why this document treats
   it as a hygiene note rather than an incident.)

---

## 9. Summary of this session's concrete changes

All in `avatark-platform-web`:

- `packages/product-registry/src/registry.ts`: `avatark`'s `domain`
  finalized from `null` to `https://avatark-platform-web.vercel.app`
  (§1, resolves CFG-1).
- `.github/workflows/ci.yml`: push-trigger branch corrected from the
  nonexistent `main` to the real trunk `platform/foundation-20260714`
  (resolves CFG-4).
- `.env.example`: corrected an overstated confidence claim about GameK's
  URL; added accurate, cited comments for `NEXT_PUBLIC_ARENAK_URL` and
  `NEXT_PUBLIC_STREAMK_URL` (previously blank/uncited); noted that none
  of the seven cross-product URL variables are actually read by code.
- Removed the stale, confirmed-merged, confirmed-clean git worktree at
  `.claude/worktrees/rc5-handoff-docs/` (resolves CFG-7).
- Independently re-confirmed ArenaK's Vercel project identity by direct
  project-ID check (resolves CFG-9).

Quality gates re-run after every change: `tsc --noEmit` clean, `eslint .`
clean, `npm test` 106/106 passing, `npm run build` 33 routes, all
unchanged from the pre-session baseline except for the registry domain
value itself.

**Not resolved, and correctly not resolved by this session**: GameK's
production domain (§3 — a human decision among four candidates, deepened
rather than closed by this session's new `vercel.json` evidence), the
`NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS` production value (CFG-2 —
blocked on the domain decision above, and in any case requires actually
setting a value in `prometheusk-web`'s live Vercel project, which this
sandboxed session cannot do), and any live dashboard-level verification
of Supabase Auth, Google OAuth, or Resend configuration (no network
access from this environment).
