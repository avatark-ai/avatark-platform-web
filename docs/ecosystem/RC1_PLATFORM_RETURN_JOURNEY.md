# RC1 — Avatar Platform Return Journey

| Owner | Status | Version | Last Reviewed |
|---|---|---|---|
| AvatarK Ecosystem Program Office (EPO) | Final | 1.0 | 2026-07-21 |

Session 13, Phase 5, RC1 Implementation, Iteration 4. Repository:
`avatark-platform-web`, branch `feature/avatar-home-registry-navigation`.
Architecture frozen per this session's brief. Mission: implement the
Platform-side experience for users returning from products, using only
the existing LaunchContext/ReturnTo contracts and existing journey
information — no new protocol, no Timeline, no Recommendations, no
changes to GameK, PrometheusK, Arena, or Stream.

---

## Read first

All eight documents named in this session's brief were read before any
change was made: `WAVE1_REGISTRY_INTEGRATION_REPORT.md`,
`WAVE2_IDENTITY_REPORT.md`, `WAVE2A_IDENTITY_IMPLEMENTATION.md`,
`RC1_IMPLEMENTATION_ITERATION1.md` (this repo);
`WAVE3_CONSUMER_JOURNEY.md`, `WAVE3A_FIRST_CONSUMER_JOURNEY.md` (located
in `gamek-web/docs/ecosystem/`, not this repo — same as Iteration 1);
`PLATFORM_EVENTS_V1.md`, `PLATFORM_ACTIVITY_TIMELINE_V1.md` (located in
`dt4m-os/docs/ecosystem/`, read for context only — neither Timeline nor
Events was implemented, per this session's explicit instruction).

**Checked before implementing anything**: whether `gamek-web` or
`prometheusk-web` had moved since Iteration 1 (`git log` on both, read
this session). Neither has — `gamek-web` is still at `a4af327`,
`prometheusk-web` still at `9215de2`. So every cross-repo finding from
`RC1_IMPLEMENTATION_ITERATION1.md` (GameK has no outbound "Return to
AvatarK," Platform's own registry domain is still `null`) is re-confirmed
current, not stale.

---

## Implemented

All changes are inside `avatark-platform-web`; no other repository was
touched.

### 1. Fixed an inverted status message in `components/HomeContinuity.tsx`

The home page's returning-visitor banner read `journey.practiceCompletedAt
? "You have a practice in progress." : "Welcome back."` — backwards:
`practiceCompletedAt` means the practice was *completed*, not left
mid-way. A visitor who had actually finished their practice was told they
had one "in progress." Fixed so each real state gets its own accurate
heading: completed, in-progress (witness set, not yet completed), or
plain welcome-back (neither, but has visited before).

### 2. Extracted the "what's the next step" decision into a shared function

`app/journey/today/page.tsx`'s `TodayView` already computed a correct,
specific "recommended next step" (Begin with an Echo / Continue to the
practice / Return to your practice) from `JourneyContext` — but this logic
was inline in that one component, and the home page's banner didn't use
it at all, only linking generically to `/journey`. Extracted into
`lib/journey/continuity.ts`'s `getContinuityAction(context)`, a pure
function with no new inputs — same `JourneyContext` fields, same three
destinations (`/start`, `/witness/[slug]`,
`buildContinueUrl()`) — now called from both `TodayView` and the new
`HomeContinuity`. This directly implements the mission's ask ("If the
Platform already has enough information to offer Continue Journey /
Resume / Return to Practice, implement those affordances") without a
second, independently-drifting copy of the same decision.

**This is not a new Recommendation surface.** It reads no cross-product
signal, computes nothing, and is scoped to exactly the three fields
(`intention`, `witness`, `practiceCompletedAt`) already in
`lib/journey/state.ts`'s `JourneyContext` — the same real, RC5-verified
continuation signal this repo has had since before this session.

### 3. Fixed a real sequencing gap discovered while extracting the logic above

Tracing the data flow (not merely re-reading `TodayView`'s existing
branches) surfaced a genuine defect: `practiceCompletedAt` is recorded
immediately at `/continue` when a receipt verifies
(`lib/journey/state.ts`'s `recordPracticeCompletion`), but `witness`/
`intention` are only persisted into the same `JourneyContext` later, when
`/journey/today`'s effect absorbs them from the URL
(`lib/journey/session.tsx`'s `absorbIntentionParams`). **A visitor who
completes a practice and never clicks through to `/journey/today` (e.g.
closes the tab from `/continue` after seeing "You completed your first
practice") ends up with `practiceCompletedAt` set but `witness`/
`intention` still `null`.** The original branch order
(`if (!intention && !witness) → "Begin with an Echo"`) would tell that
visitor to begin again, on their next visit, despite having already
completed the one practice that exists. Fixed by checking
`practiceCompletedAt` first, ahead of `witness`/`intention` — this
existed identically in the original `TodayView` logic before extraction;
it was not introduced by the refactor, only surfaced by tracing it
carefully enough to design a test against it (see Verified).

### 4. Fixed a product-naming inconsistency: "Prometheus" vs "PrometheusK"

`app/journey/today/page.tsx` had three copy strings reading "on
Prometheus" / "verified by Prometheus" — dropping the "K" — while the
product registry's own canonical `displayName` for this product is
"PrometheusK", used everywhere else in this repo. This is exactly the
kind of drift Step 2's "verify Platform can identify... Origin Product...
Return Product" is checking for: a returning visitor's own "what did I
complete, and where" copy should name the product the same way the rest
of the app does. Fixed by exporting `PROMETHEUSK_DISPLAY_NAME` from
`lib/onboarding/prometheusk.ts` (derived from the same already-resolved
registry object that file already uses for `PROMETHEUSK_ORIGIN` — no new
registry access pattern), and using it everywhere "Prometheus" was
previously a hardcoded literal, including the new `HomeContinuity`
heading.

### 5. Added a test for the new pure function

`lib/journey/continuity.test.ts` — four cases: no intention/no witness,
intention-only, witness-present (completed or not, same destination), and
the completed-but-no-witness sequencing gap (§3) specifically, asserting
it no longer routes to "Begin with an Echo." Registered in `package.json`'s
explicit test file list, matching this repo's existing convention (its
test runner takes an explicit list, not a glob).

### Nothing else was changed

`packages/product-registry`, `lib/identity/`, `lib/products/registry.ts`,
`components/SiteHeader.tsx`, and every route not named above were read
and left untouched — see Verified, below, for what was checked and found
already correct.

---

## Verified

### Registry integration (Step 2) — Current/Origin/Return Product, Entry Source

- **Current Product** (Avatar Platform itself): always implicit — the
  header (`components/SiteHeader.tsx`) always renders "AvatarK," and no
  page needs to resolve itself through the registry. Platform's own
  registry entry (`avatark`) still has `domain: null`, unchanged since
  Iteration 1 — not fixed, for the same reason Iteration 1 didn't invent
  one: no confirmed domain exists anywhere in this program's governance
  corpus, and guessing one would violate this program's standing "don't
  invent" discipline.
- **Origin Product** (where a returning visitor's completed practice
  happened): the only real origin signal is a verified PrometheusK
  receipt (`lib/onboarding/receipt.ts`'s `verifyReceipt`), which by
  construction only ever validates for `iss === 'prometheusk-web'` — its
  mere existence is the origin fact, no new field needed. Now correctly
  *named* in UI copy via `PROMETHEUSK_DISPLAY_NAME` (§4), where it was
  previously a hardcoded, drifted string.
- **Return Product** (where "Resume"/"Return to Practice" sends a
  visitor): `buildContinueUrl()`/`buildBorrowUrl()` both resolve
  PrometheusK's origin through `@avatark/product-registry` (unchanged,
  confirmed by re-reading `lib/onboarding/prometheusk.ts` this session) —
  no duplicated URL, matching Iteration 1's own finding, re-verified
  clean.
- **Entry Source**: the `source` query param is a fixed constant,
  `'avatark-onboarding'`, checked exactly in both
  `buildBorrowUrl()`/`verifyReceipt()` — confirmed unchanged, no second
  value or divergent spelling exists anywhere in this repo.
- Re-ran the same domain-literal grep as Iteration 1 across `lib/`, `app/`,
  `packages/`: no new hardcoded product domain was introduced by this
  session's changes.

### Continue Journey / Resume / Return to Practice / Return to Explore (Step 3)

- **Continue Journey**: `/journey` → `/journey/today` unchanged in
  destination; now also directly reachable from the home page via the
  fixed `HomeContinuity` banner instead of only via the header's
  "Continue" link.
- **Resume / Return to Practice**: now genuinely implemented on the home
  page itself (§2), not only on `/journey/today` — using the exact same
  decision and destination, traced by hand for all four `JourneyContext`
  states (see the four `continuity.test.ts` cases) and confirmed
  consistent.
- **Return to Explore**: **not implemented, honestly, because no existing
  information supports it.** `JourneyContext` has no field recording that
  a visitor was ever in GameK (Explore) — GameK sends no arrival signal to
  Platform, has no outbound link to Platform, and nothing in this repo's
  own data model tracks "last product visited" beyond the PrometheusK-
  specific `witness`/`practiceCompletedAt` fields. A generic, always-
  visible "Explore" card already exists on the home page (unconditional,
  not gated on any journey state) — that is the honest ceiling of what
  "Return to Explore" can mean today without inventing a signal that
  doesn't exist. Per this session's explicit "use existing information
  only" instruction, nothing new was built here.

### Navigation (Step 4)

`components/SiteHeader.tsx` read in full: already shows a "Continue" link
(→ `/journey`) and "Account" in place of "Sign in" for a signed-in
visitor — a returning user's header already looks materially different
from a first-time visitor's. No defect found; not changed.

### Quality gates (all re-run fresh this session)

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint .` — clean, exit 0.
- `npm test` — **106/106 passing** (102 at Iteration 1's baseline + 4 new
  cases in `continuity.test.ts`).
- `npm run build` — succeeded, 33 routes, unchanged from every prior
  iteration's baseline.

### Manual trace of the real, working return path

No live browser or database is reachable from this session (unchanged,
long-standing environment limitation — see prior sessions' own notes).
Verified by static trace of the actual code, both sides of every trust
boundary crossed, exactly as Iteration 1 did:

1. Sign in, land on `/`. First-ever visit (no journey data yet):
   `HomeContinuity` renders nothing — correct, matches its own original,
   unchanged design intent.
2. `/start` → choose an intention → `/witness/the-promise-to-myself?intention=X`
   → "Borrow This Practice" → `/api/onboarding/begin` (sets the
   `rc5_onboarding_state` cookie, redirects to PrometheusK's signed
   borrow URL).
3. On PrometheusK (read, not modified): `runtime → reflection → echo
   (Living Echo) → recommendation`, where `ReturnToAvatarK` renders and,
   on click, issues a signed receipt and redirects to `/continue?receipt=...`.
4. `/continue` verifies the receipt server-side; if signed in,
   `recordPracticeCompletion` sets `practiceCompletedAt` immediately.
   `ContinueGate` shows "You completed your first practice" and a
   "Continue Your Journey" link to `/journey?intention=X&witness=...`.
5. **Branch A (visitor clicks through)**: lands on `/journey/today`,
   which absorbs `intention`/`witness` into `JourneyContext`, then shows
   the snapshot (now correctly labeled "on PrometheusK") and "Return to
   your practice."
6. **Branch B (visitor closes the tab at step 4 instead)**:
   `practiceCompletedAt` is set, `witness`/`intention` are not. Next
   visit to `/` — before this session's fix, `getContinuityAction`'s
   predecessor logic would have shown "Begin with an Echo" again, which
   would have been wrong. **After this session's fix, it correctly shows
   "You completed The Two-Minute Check-In on PrometheusK." and "Return to
   your practice."** This is the concrete scenario the fix in
   Implemented §3 exists for.

**The mission's literal diagram (Avatar Platform → GameK → PrometheusK →
Living Echo → Return → Avatar Platform) does not exist as a real path
today, and cannot be made to exist from this repository alone** — see
Remaining RC1 blockers. The path actually verified above (Platform →
PrometheusK directly, bypassing GameK) is the one real round trip this
program has, and it is what this session's Platform-side fixes apply to.

---

## Remaining UX gaps

- **"Return to Explore" has no personalized form** (see Verified, Step 3)
  — the generic Explore card is the honest ceiling without new
  cross-product information this session was told not to invent.
- **A visitor who completes their practice via Branch B (§ manual trace)
  never sees the "✓ Completion verified" snapshot or their intention
  label** until they separately visit `/journey/today` at some point —
  the home banner now correctly sends them back to PrometheusK, but the
  richer snapshot view still requires that one extra page, since
  `witness`/`intention` are never absorbed anywhere except
  `/journey/today`'s own effect. Not fixed this session: doing so would
  mean deciding whether `/continue` itself should also absorb
  `intention`/`witness` directly (a real, in-scope-sized fix, but a
  second design decision beyond what this iteration's brief asked for —
  flagged for a future iteration rather than folded in here to avoid
  scope creep on top of an already-real fix).
- **The banner's copy still says "PrometheusK" mid-sentence in a way that
  reads slightly more formal than the rest of this app's casual voice**
  (e.g. "The Promise to Myself," "the promise to myself" elsewhere) — a
  cosmetic, not functional, follow-up; not addressed here since Step 2's
  actual concern (correct identification, not tone) was what was in
  scope.

## Remaining RC1 blockers

Unchanged from Iteration 1, re-verified current this session (both
sibling repos' `git log` checked, neither has moved):

1. **No leg exists anywhere for a GameK-mediated visitor to return to
   Avatar Platform.** Confirmed at the code level this session:
   `prometheusk-web`'s `/run/[practiceId]` (the page GameK's handoff
   targets) only ever renders `ReturnToGameK`, gated on
   `source === 'gamek'` — there is no branch in that file, or anywhere
   else in `prometheusk-web`, that offers a "Return to AvatarK" option
   for a GameK-originated visitor. Platform's own RC5 receipt flow only
   fires on the *other* PrometheusK route
   (`/my/borrow/[journeyId]/practice/[practiceId]`), which GameK's
   handoff never targets. These are two different pages in
   `prometheusk-web`, not two branches of one page — closing this gap
   requires a `prometheusk-web` change (out of this session's scope: "Do
   not modify PrometheusK") plus, most likely, a `gamek-web` change to
   thread a Platform-origin signal through its own handoff (out of scope:
   "Do not modify GameK"). Not fixable from `avatark-platform-web` alone,
   same conclusion as Iteration 1.
2. **Platform's own registry domain is still `null`** — even if the leg
   above existed, no other repo has a confirmed address to send a visitor
   back to. Unchanged; still a deferred human naming/domain decision, not
   invented here.
3. **GameK's PrometheusK handoff still sends every visitor to the same
   single practice** (Iteration 1's finding, unchanged) — a
   content-authoring gap, not something this or any Platform-side session
   can resolve.
4. **Explore → GameK still carries no arrival signal** (unchanged) — even
   with today's fixes, Platform has no way to know a visitor is heading
   to or coming from GameK specifically, only that they are, generically,
   "signed in with a PrometheusK-shaped journey or not."

None of the four are resolvable inside `avatark-platform-web` alone.
