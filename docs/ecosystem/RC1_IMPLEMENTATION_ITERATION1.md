# RC1 Implementation — Iteration 1

| Owner | Status | Version | Last Reviewed |
|---|---|---|---|
| AvatarK Ecosystem Program Office (EPO) | Final | 1.0 | 2026-07-21 |

Session 10, Phase 5, RC1 Implementation, Iteration 1. Repository:
`avatark-platform-web`, branch `feature/avatar-home-registry-navigation`.
Architecture frozen per this session's brief: independent repos,
independent databases, no merge of either; Platform owns Identity/
Registry/Account/Activity Timeline; products own their own data/runtime/
UI; Platform consumes contracts. This document reports against the five
implementation-order steps in that brief, in order.

---

## Read first

- `docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md`,
  `WAVE2_IDENTITY_REPORT.md`, `WAVE2A_IDENTITY_IMPLEMENTATION.md` (this
  repo).
- `docs/ecosystem/WAVE3_CONSUMER_JOURNEY.md` — not found in this repo or
  `dt4m-os`; located and read from `gamek-web/docs/ecosystem/` instead
  (its actual location on this machine).
- `docs/ecosystem/PLATFORM_EVENTS_V1.md` and
  `PLATFORM_ACTIVITY_TIMELINE_V1.md` — not found in this repo; located and
  read from `dt4m-os/docs/ecosystem/` instead. Both are architecture-only
  documents about a Timeline/Event layer this iteration's brief explicitly
  excludes ("Do not implement Timeline," "Do not implement Event Bus") —
  read for context, not acted on.
- **`gamek-web/docs/ecosystem/WAVE3A_FIRST_CONSUMER_JOURNEY.md`** — not in
  this session's "Read First" list, but discovered while verifying Step 4
  (below) and directly material to this repo's own RC1 blockers, so it is
  cited throughout this report. `gamek-web`'s own commit `a4af327` (2026-07-21,
  same day as this session, evidently a separate iteration of this same
  RC1 effort scoped to that repo) replaced GameK's internal `/prometheusk`
  placeholder with a real outbound handoff to `prometheusk-web`. This
  changes the honest answer to "how much of the mission's success
  criteria is real today" versus what Wave 3 found — reported accurately
  below rather than repeating Wave 3's now-partially-stale finding.

No file in `gamek-web`, `prometheusk-web`, or `dt4m-os` was modified this
session. Reading across repos was for verification only, per this
program's established discipline (Session 5 EPO onward) that cross-repo
reads are fine, cross-repo writes are not, absent an explicit instruction
scoping the session to that repo.

---

## Implemented

**Nothing new was implemented in this repo this iteration.** Step 1 — the
one concrete implementation task this session's brief names — was already
built in a prior session (`a57d4a4`, "Wave 2A"), confirmed by direct
re-reading of the code (not by trusting that session's own report), and
re-verified clean against a fresh run of all four quality gates. Steps
2–5 are verification steps by the brief's own wording ("Verify..."), and
verification found no incorrect implementation to fix. This is reported
plainly rather than manufacturing a change to make this iteration look
more active than it honestly was — per the session's own Final Rule,
"the objective is a stable, demonstrable RC1, not additional features."

### Step 1 — Identity Contract fix (already implemented; re-verified this session)

`lib/identity/supabaseIdentityProvider.ts`'s `loadClaims()` and
`app/api/identity/verify/route.ts` both now populate `organizationIds`,
`productAccess`, and `roles` from real tables
(`organization_members`/`product_access`/`platform_roles`) via one shared
function, `lib/identity/claims.ts`'s `loadIdentityExtras(supabase,
userId)` — confirmed by reading all four files directly this session, not
assumed from `WAVE2A_IDENTITY_IMPLEMENTATION.md`'s own description.

- **Reuses existing logic**: `loadIdentityExtras` reads the same tables
  via the same own-row-RLS query shape `lib/account/adapters.ts` already
  used before this fix existed (migration 014's `*_select_own` policies).
- **No duplicated authorization logic**, checked specifically against
  this session's own instruction not to have any: `lib/admin/authz.ts`'s
  `getAdminContext()` still runs its own `platform_roles` query — but,
  read directly this session, it is not a duplicate of
  `loadIdentityExtras`'s logic. It answers a narrower, different question
  server-side (`role = 'admin'` via `.maybeSingle()`, for gating `/admin`
  access) than `loadIdentityExtras` answers (all of a user's roles, for
  the general identity contract) — reusing it would mean fetching every
  role and filtering client-side just to ask a yes/no question, a
  regression, not a simplification. Leaving it alone was the correct call
  in Wave 2A, re-confirmed by reading it this session, not merely
  inherited without checking.
- `/api/identity/verify` reads these tables through a second Supabase
  client scoped to the caller's own verified bearer token (not a
  service-role client), so `organization_members`/`product_access`/
  `platform_roles`'s existing own-row RLS policies resolve correctly —
  confirmed by reading the route directly.

---

## Verified

### Step 1 — quality gates (re-run fresh this session, not copied from Wave 2A's own report)

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint .` — clean, exit 0.
- `npm test` — **102/102 passing**, matching Wave 2A's own baseline exactly
  (no regression since).
- `npm run build` — succeeded, 33 routes, unchanged from the Wave 1/2/2A
  baseline.

### Step 2 — Registry remains the single source of truth

Grepped this repo's `lib/`, `app/`, and `packages/` trees (excluding
`.next`, `node_modules`, and the stale `.claude/worktrees/rc5-handoff-docs/`
copy — see Technical Debt) for every known product domain string
(`avatark.ai`, `avatark.io`, `prometheusk.avatark.io`, `app.avatark.ai`,
`streamk.ai`, `arenak.ai`). The **only** place any of them appears as a
canonical domain value is `packages/product-registry/src/registry.ts`
itself. Every consumer (`lib/onboarding/prometheusk.ts`,
`lib/products/registry.ts`, `lib/activities/registry.ts`,
`lib/account/adapters.ts`, `app/admin/products/page.tsx`) resolves through
the registry package, exactly as Wave 1 found and fixed — no new
duplicated literal was introduced by Wave 2/2A's identity-only changes.
One cosmetic (non-functional) label was noted, not fixed — see Technical
Debt.

### Step 3 — Platform launch URLs produce the correct LaunchContext

Traced the full outbound path in code, both sides of the trust boundary
(this repo, and a read-only check of `prometheusk-web`'s receiving code,
since the contract is inherently cross-repo):

`app/witness/[slug]/page.tsx` → `app/api/onboarding/begin/route.ts`
(generates the `state` nonce, sets the `rc5_onboarding_state` httpOnly
cookie, calls `buildBorrowUrl()`) → `lib/onboarding/prometheusk.ts`'s
`buildBorrowUrl()`, which resolves PrometheusK's origin through the
registry (not a hardcoded literal) and sets `source=avatark-onboarding`,
`witness`, `returnTo`, plus optional `intention`/`invitation`/`cohort` —
matches `docs/RC5_HANDOFF_CONTRACT.md`'s documented architecture exactly,
field for field.

Cross-checked against `prometheusk-web`'s actual receiving code (read,
not modified): `BorrowedPracticePage`
(`app/(workspace)/my/borrow/[journeyId]/practice/[practiceId]/page.tsx`)
gates rendering `ReturnToAvatarK` on `source === 'avatark-onboarding' &&
state && returnTo` and the practice being in
`RECEIPT_ELIGIBLE_PRACTICE_IDS` — the same practice ID
(`aad2380d-8d13-4499-8ac9-eb37d9f41cbb`) this repo's own
`DRIFT_PRACTICE_ID` names. The state machine genuinely runs
`runtime → reflection → echo → recommendation` in that order, with no
code path that skips a stage — confirmed by reading the component, not
inferred from its own comment. **No incorrect implementation found; no
fix made.**

### Step 4 — ReturnTo contract consistency

Compared the two repos' receipt claim schemas directly, field by field:
`prometheusk-web/lib/onboarding/receipt.ts`'s `issueReceipt()` and
`avatark-platform-web/lib/onboarding/receipt.ts`'s `verifyReceipt()` agree
exactly on `v`, `iss` (`prometheusk-web`), `aud` (`avatark-platform-web`),
`status`, `source`, the practice-ID allowlist, and the HMAC format —
confirmed by reading both files side by side this session, not by trusting
either repo's own documentation of the other. The `rc5_onboarding_state`
cookie name matches between the setter (`app/api/onboarding/begin/route.ts`)
and the reader (`app/continue/page.tsx` via `ONBOARDING_STATE_COOKIE`).
**No incorrect implementation found in this repo's half of the contract;
no fix made.**

**The mission's diagram — "Platform ↓ GameK ↓ PrometheusK ↓ Return" — names
a second, separate contract this repo is not a party to**, and this
iteration's honest scope is to report on it accurately, not to conflate
it with RC5. Read directly, not inferred: `gamek-web`'s new (`a4af327`,
same day as this session) `lib/gamek/prometheusk.ts` builds an outbound
handoff to PrometheusK's **different** route (`/run/[practiceId]`, not
`/my/borrow/...`) using `source=gamek` (not `avatark-onboarding`) and a
**plain `returnTo` link, not a signed receipt** — `prometheusk-web`'s own
`components/gamek/ReturnToGameK.tsx` documents this as a deliberate,
different-tier design choice ("why this is a plain link, not a signed
receipt like the AvatarK RC5 flow"), not an inconsistency or a bug. Read
directly and confirmed real: `app/(workspace)/run/[practiceId]/page.tsx`
gates `ReturnToGameK` on `source === 'gamek' && returnTo &&
isAllowedGamekReturnOrigin(returnTo)`, after the same
`runtime → reflection → echo → recommendation` state machine.

**So there are, correctly, two contracts, not one duplicated
inconsistently**: RC5 (Platform ↔ PrometheusK, signed receipt) and the
GameK↔PrometheusK plain-link handoff (`gamek-web`'s own iteration of this
same RC1 effort). Both reuse the same *pattern* (a Route Handler resolving
its own origin from the incoming request, `source`/`returnTo` query
params, an allowlisted return origin) without being the same mechanism —
this is consistent, deliberate design, not drift, confirmed by reading
all four files (two per repo) directly rather than assuming consistency
from either repo's own claim.

### Step 5 — placeholder removal

Grepped this repo's `lib/` and `app/` trees for `TODO`, `FIXME`,
`placeholder`, `stub`, `not implemented`. Every hit is one of: an HTML
input `placeholder` attribute (real form UI, not a code stub), the
`new URL(path, "https://placeholder.invalid")` technique (a real,
intentional pattern for building a relative path safely with
`URLSearchParams`, already used in three places before this session and
confirmed still correct, not a leftover stub), or a comment explicitly
documenting a real, honest gap (design tokens pending real brand assets,
`supportsBilling: false` because no billing system exists anywhere in the
ecosystem). **No placeholder was found with a real implementation already
available to replace it — nothing was removed, because there was nothing
eligible to remove.**

---

## Remaining RC1 blockers

Ranked by what blocks the mission's stated success criteria (Open Avatar
Platform → Explore → Enter GameK → Launch PrometheusK → Complete Practice
→ Reach Living Echo → Return successfully), using only what was verified
by reading real code this session or Wave 3A's own equivalent trace,
never assumed:

1. **No leg exists anywhere for "Return" to reach back to Avatar
   Platform.** The success criteria's own final step, "Return
   successfully," is ambiguous between "return to the product one hop
   back" (GameK, per `gamek-web`'s new handoff — real) and "return all
   the way to Avatar Platform" (not real, on any path). `gamek-web` has no
   outbound "Return to AvatarK" link anywhere in its code (confirmed
   unchanged since Wave 3's audit — `a4af327` only built the GameK→
   PrometheusK→back-to-GameK leg, explicitly scoped that way in its own
   report). Even if it did, **this repo's own registry entry for itself
   (`avatark`) still has `domain: null`** (Wave 1, re-confirmed this
   session by reading `packages/product-registry/src/registry.ts` —
   unchanged) — no other repo has a confirmed address to send a visitor
   back to. This is not fixable from this repo alone: closing it needs
   (a) a confirmed Platform domain, a naming-authority decision this
   program has repeatedly declined to make unilaterally, and (b) GameK-side
   code to use it, out of this session's repository scope.
2. **GameK's handoff sends every visitor to the same PrometheusK
   practice**, regardless of which Episode they came from (Wave 3A's own
   documented limitation, re-confirmed by reading `lib/gamek/prometheusk.ts`
   this session) — real content-authoring work, not a code defect, and not
   this repo's to solve.
3. **GameK's "Back to GameK" return leg is config-dependent and
   unverifiable from here.** `prometheusk-web`'s
   `isAllowedGamekReturnOrigin()` gates on a `prometheusk-web`-side env
   var (`NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS`) this session cannot
   read or set (it lives in a repo this session did not touch, per its
   own scope). If GameK's real production origin isn't in that allowlist,
   the outbound GameK→PrometheusK hop still works, but the return card
   silently doesn't render — an operational dependency, not a code gap in
   any of the three repos' own logic.
4. **Explore → GameK still drops all context on arrival** (Wave 1/Wave 3,
   re-confirmed unchanged this session — no new arrival-handling code was
   found in `gamek-web` beyond the new outbound PrometheusK handoff). A
   visitor's identity/intent from Avatar Platform is not carried into
   GameK today, so even once (1) is closed, GameK would need its own
   inbound-arrival code to know a "Return to AvatarK" is even meaningful
   context to offer — not designed or built by this iteration.

None of these four are fixable inside `avatark-platform-web` alone — each
either requires a cross-repo naming/domain decision this program has
consistently deferred to a human, or code changes in a repository this
session was not scoped to touch.

---

## Technical debt discovered

- **A stale git worktree, `.claude/worktrees/rc5-handoff-docs/`, sits
  inside this repo's own tree, untracked** (`?? .claude/` in `git
  status`). It contains an older copy of `lib/onboarding/prometheusk.ts`
  and `app/journey/today/page.tsx` from what appears to be an earlier,
  abandoned RC5-docs session. Not touched or deleted this session — it is
  untracked, does not affect `tsc`/`eslint`/`test`/`build` (all of which
  ran against the real working tree, confirmed by their route/file
  counts matching the expected baseline), and deleting another session's
  leftover working state without knowing why it's there is exactly the
  kind of action this program's own safety discipline says to leave
  alone rather than guess about.
- **`docs/PLATFORM_ENTRY_EXPERIENCE_HANDOFF.md` has an uncommitted,
  in-progress edit already sitting in the working tree** (`M` in `git
  status`, present before this session started) — a real, legitimate
  update reconciling that handoff doc with Session 6/Wave 1's registry
  fixes. Not this session's to finish or commit (mission scopes this
  session to producing exactly two new documents and committing only
  those); left exactly as found.
- **`app/admin/products/page.tsx:71`** labels an account-return link as
  literal text `avatark.ai/account`, even though the actual `href` is a
  correct, registry-independent relative path (`/account?return=...`) and
  even though Platform's own registry entry has no confirmed domain
  (immediately above). Cosmetic only — the link behaves correctly — not
  fixed, since Step 2's actual concern (functional link correctness, not
  admin-page label copy) was not violated and this isn't a defect the
  success criteria depends on.
- **`loadIdentityExtras`, `lib/account/adapters.ts`'s membership/role
  helpers, and `lib/admin/authz.ts`'s admin check are three independent
  readers of the same three tables**, sharing a query *shape*
  (own-row-RLS filters) but not literal code, by Wave 2A's own deliberate
  choice, re-confirmed correct this session (see Verified, Step 1). Not a
  defect; named here only so a future session doesn't rediscover this and
  assume it's an oversight.
