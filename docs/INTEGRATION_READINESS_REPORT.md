# Integration Readiness Report

**As of:** end of Integration Sprint RC1, `feature/avatar-platform-rc3` @ `0c6d861`. Author's role
for this document: verification only — no code was modified to produce it. One correctness
observation is noted in §3 and §5; it was not fixed, per this review's own charter ("no
implementation unless a correctness issue is discovered — otherwise stop and wait for Integration
Sprint 2").

---

## 1. Repository Summary

### What AvatarK (`avatark-platform-web`) owns

- **Identity, auth, account, organizations, roles, product access, platform admin** — the
  pre-existing shared layer every product integrates with once (`docs/PLATFORM_COMPLETION_CHECKPOINT.md`).
- **The Entry Engine** — invitation preview/acceptance/metadata, guest context, Watch First
  routing, practice-intro routing (`/enter/[token]`, `/enter`, `/watch-first`, `/witness/[slug]`).
- **The Journey Orchestrator** (`lib/journey/*`, frozen) — the manifest shape, the 9-step state
  machine, the 4 handoff contracts, deep-link metadata, and recovery decision logic. This is the
  one place that decides what step a participant is on and what should happen next.
- **The Integration Layer** (`lib/integrations/*`, frozen this sprint) — adapters, stage/boundary
  lookup, dashboard, and simulator: visualization over the orchestrator, nothing more.
- **Its own content model** (`content/echo/`) and its own Supabase project (identity, journey
  state, account data).

### What AvatarK deliberately does NOT own

- **Practice runtime, reflection, evidence, Living Echo** — PrometheusK's (`prometheusk-web`), a
  separate Supabase project with no trust relationship to this one.
- **The media player / streaming** — StreamK/CinemaK.
- **The competitive layer** — ArenaK (whose real implementation, per the product registry's own
  comment, "lives inside a separate `dt4m-os` repo's `apps/avatark-consumer`, not as a sibling
  repo folder in this workspace").
- **Creation tooling** — StudioK.
- **Networking, HTTP, or synchronization for any of the above** — every handoff this repo builds
  is a typed object or a URL string; nothing here calls out to another product's API.

---

## 2. Integration Matrix

The mission's requested chain is **StudioK → StreamK → AvatarK → Prometheus → Living Echo →
Arena** — six nodes, five edges. Two of these edges (StudioK→StreamK, StreamK→AvatarK) were never
in scope of any sprint to date; the Journey Orchestrator only ever modeled AvatarK as the
*origin* of a chain (AvatarK→StreamK→Prometheus→LivingEcho→Arena, per
`ENTRY_ENGINE_ARCHITECTURE.md`), not as a mid-chain relay receiving from StudioK/StreamK. That
asymmetry is reported below, not papered over.

| Edge | Status | Reasons |
|---|---|---|
| **StudioK → StreamK** | **PLANNED** | No code anywhere in this repo references StudioK as an adapter, handoff target, or integration point — confirmed by a full-repo grep; every hit is a registry stub, a footer link, or roadmap prose. StudioK has no confirmed local repository (`docs/PRODUCT_REGISTRY.md`, `docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md`: "not applicable yet — neither product is integrated with Platform beyond a registry stub"). This edge is also outside this repo's ownership boundary entirely (§1) — AvatarK is not positioned to build it. |
| **StreamK → AvatarK** | **PARTIAL** | The *state machine* allows this direction implicitly: `watch_first`'s only legal next step is `practice_intro` (AvatarK-owned, `STATE_MACHINE.md`'s transition table), so control does return to AvatarK after Watch First. But **no handoff contract or adapter models this direction** — `lib/journey/handoffContracts.ts` only has `EchoToStreamKHandoff` (outbound), never a return shape. The Integration Sprint's own `stages.ts` explicitly reports this transition as "no product boundary crossed" (it's in-repo navigation, not a cross-product handoff) — which is honest, but means a *real* StreamK-hosted experience returning control to AvatarK has no typed contract to arrive through. |
| **AvatarK → Prometheus** | **PARTIAL** | The mechanism is real and correctly built (`lib/onboarding/practiceHandoff.ts` + `prometheusk.ts`'s `buildBorrowUrl`, `StreamKToPrometheusHandoff`) — but it currently has **zero reachable destinations**: `PRACTICE_HANDOFF_REGISTRY` has exactly one entry (`the-promise-to-myself`), deliberately mapped to `null` after an audit found the previous mapping pointed at an unrelated PrometheusK practice, and none of PrometheusK's 5 real practices is a content match. `isPracticeHandoffAvailable` is `false` for every practice slug that exists today. The "Borrow This Practice" CTA never renders as a result. |
| **Prometheus → Living Echo** | **PARTIAL** (was reported READY by the sprint's own docs; verification here found a live-environment blocker) | The RC5 signed-receipt loop is real, code-complete, and independently audited before this session (`RC5_HANDOFF_CONTRACT.md`). But in *this* environment, `.env.local` does not set `ONBOARDING_RECEIPT_SECRET` — `verifyReceipt`'s `getSecret()` returns `null`, so **every receipt verification fails with `not_configured`**, regardless of whether PrometheusK ever issues one. Separately, `lib/onboarding/receipt.ts`'s `ALLOWED_PRACTICE_IDS` only contains `DRIFT_PRACTICE_ID` — the exact practice ID the practice-handoff audit (line above) found was the *wrong* mapping and removed. No currently-mapped practice could ever produce an allowed receipt even with the secret configured. |
| **Living Echo → Arena** | **PLANNED** | No implementation anywhere in this repo (`HANDOFF_CONTRACTS.md`'s own statement, unchanged). ArenaK's real implementation lives in a separate `dt4m-os` repo not present in this workspace. Registry-side, ArenaK's domain/visibility were confirmed reachable in an earlier session (Wave 1), but `status` deliberately stays `alpha` — a human maturity call, not a data fix — so it still reads `coming_soon` everywhere `lib/activities/registry.ts` gates on status. |

**Net reading:** of five edges, zero are unconditionally READY. Two are PARTIAL for the same root
cause (a real mechanism with no live destination to reach), one is PARTIAL for a missing-config
reason unique to this environment, and two are PLANNED with no code built. The chain the mission
named cannot complete end-to-end today, live, in any environment — not because of a bug, but
because the necessary content/config was never supplied (all four PARTIAL/PLANNED findings above
are pre-existing, previously audited gaps, not new discoveries).

---

## 3. Contract Review

Every object either sprint produces was checked field-by-field against its published contract.

| Handoff | Contract source | Producer(s) | Match? |
|---|---|---|---|
| `EchoToStreamKHandoff` | `lib/journey/handoffContracts.ts` / `HANDOFF_CONTRACTS.md` | `buildEchoToStreamKHandoff`, consumed unmodified by `lib/integrations/stages.ts` | **Match.** Fields identical; `stages.ts` never reshapes the object, only routes to it. |
| `StreamKToPrometheusHandoff` | same | `buildStreamKToPrometheusHandoff` | **Match.** Also matches the *real* implementation's field names (`practiceId`/`witness`/`invitationId`/`cohortId`/`returnTo`) in `lib/onboarding/practiceHandoff.ts`'s `PracticeHandoffContext` and `prometheusk.ts`'s `OnboardingHandoffContext` — confirmed these were never allowed to drift into two shapes for the same edge. |
| `PrometheusToLivingEchoHandoff` | same | `buildPrometheusToLivingEchoHandoff` | **Match.** `completedAt` is always caller-supplied (never `Date.now()` inside the builder), consistent with `lib/onboarding/receipt.ts`'s own `VerifiedReceipt.completedAt`, which is what a real caller would supply. |
| `LivingEchoToArenaHandoff` | same | `buildLivingEchoToArenaHandoff` | **Match.** `recommendationReason` union (`practice_completed`/`cohort_invite`/`manual`) is respected everywhere it's constructed (`lib/integrations/stages.ts`, `simulate.ts`). |

**No field-shape mismatches were found.** `git log` on `lib/journey/{handoffContracts,stateMachine,manifest,recovery,deepLinks}.ts` confirms none has been touched since their Phase 2 commits — the Integration Layer sprint only ever *read* these, never modified or shadowed them.

**One naming inconsistency, intentional and already documented — flagged for completeness, not a defect:** `lib/integrations/livingEchoAdapter.ts`'s `productId: "living-echo"` is not a real `@avatark/product-registry` id (there is no `"living-echo"` entry — Living Echo is PrometheusK's own concept, per that registry's `"prometheusk"` description and `HANDOFF_CONTRACTS.md`). This was a deliberate choice, stated in the adapter's own comment, not an oversight — but it means any future code that expects every `IntegrationAdapter.productId` to resolve via `getProductById` will need a special case for exactly this one adapter.

**One correctness observation surfaced by this review (not fixed, per this review's charter):**
`lib/onboarding/receipt.ts:22`'s `ALLOWED_PRACTICE_IDS = new Set([DRIFT_PRACTICE_ID])` still allowlists the practice ID that `lib/onboarding/practiceHandoff.ts`'s own audit comment (2026-07-26) identifies as the *wrong*, since-removed mapping. This isn't exploitable (receipts still require a valid HMAC signature from PrometheusK, and PrometheusK signs against its own state independent of this allowlist) and isn't new — it's a pre-existing consequence of the practice-handoff fix, not something introduced by Integration Sprint RC1. Flagged in §5 as debt, left unmodified: changing the allowlist without a verified real practice mapping to put in its place would be guessing, the same failure mode the original audit was correcting.

---

## 4. AI.4 Readiness

Two distinct "demos" exist today, and they are not the same demo. Both were walked step by step
(reading the actual route code, not executing against a live PrometheusK deployment, which this
environment cannot reach).

### The real, live participant journey — cannot complete today

| Step | Route | Time (est.) | Outcome |
|---|---|---|---|
| 1 | `/enter` or `/enter/{token}` | ~10–15s | Invitation preview renders: metadata (who/why/how-long/what/practice/after), journey diagram, "Continue as guest" / "Sign in." |
| 2 | Click through | instant | Lands on `/witness/[slug]` (Practice Intro). |
| 3 | `/witness/[slug]` | ~5s | **Stops here.** `isPracticeHandoffAvailable("the-promise-to-myself")` is `false` (§2) — the page renders its honest "isn't available to begin on PrometheusK yet" fallback, not a "Borrow This Practice" CTA. |

**Awkward transition:** step 3 is a hard wall with no forward path, and no visual cue *why* beyond
the (correct, honest) static copy — a live audience watching this has no way to see that the block
is "no content mapped yet" versus "something broken." Reaching PrometheusK, a receipt, or Living
Echo is not possible in this environment even if a mapping existed, because `ONBOARDING_RECEIPT_SECRET`
is unset (§2) — so this demo cannot be extended further by content changes alone; it also needs
environment configuration outside this repo's code.

### The Integration Simulator — the shortest complete live demo available today

| Step | Action | Time (est.) |
|---|---|---|
| 1 | Open `/dev/integration/simulator` | ~1–2s (page load) |
| 2 | "Invitation" scenario is selected by default | 0s |
| 3 | Read the 5 stage cards top to bottom (AvatarK → StreamK → Prometheus → Living Echo → Arena), each showing its exact incoming handoff object | ~30–40s narrated |
| 4 | Toggle Guest → Signed In | ~1s, re-renders instantly |
| 5 | (Optional) Switch scenario to "Practice" to show StreamK being honestly skipped | ~5s |

**Total: under a minute** for a complete, honest walkthrough of every stage and every real handoff
shape — this is the fastest way to show the full chain working end-to-end, because it's the only
path that doesn't depend on unreachable external services or unmapped content.

**Awkward transitions here too, smaller ones:** switching scenarios makes a stage card fade to
"not visited" with no verbal/visual explanation of *why* that stage is skipped for this scenario —
fine with a narrator, potentially confusing without one. The dashboard (`/dev/integration`) and
simulator (`/dev/integration/simulator`) are two separate routes with no single unified page, so a
demo has to navigate between them manually if both are wanted.

**Recommendation for AI.4, stated as an observation, not an action item:** lead with the
simulator. It is the only thing in this repository that can show the full six-stage story inside
a minute, honestly, without depending on anything outside this repo.

---

## 5. Technical Debt

Only items realistic to address before AI.4 — no speculative future features.

1. **The one seed practice has no PrometheusK mapping**, so the entire real
   AvatarK→Prometheus→LivingEcho chain is unreachable from the live UI regardless of everything
   else being correct. Fixing this requires either a verified content match against one of
   PrometheusK's 5 real practices, or authoring a new practice known to match one — a content/data
   decision, not a code change, and explicitly not guessed at in this or the prior audit.
2. **`ONBOARDING_RECEIPT_SECRET` is unset in this environment's `.env.local`**, and none of
   `NEXT_PUBLIC_{PROMETHEUSK,STREAMK,ARENAK}_URL` are set either (both fall back to the product
   registry's static domains, which is safe, but the receipt secret has no such fallback and
   silently fails closed). If a live cross-repo demo is wanted before AI.4, this needs to be
   supplied and shared with `prometheusk-web`'s matching signing config.
3. **`lib/onboarding/receipt.ts`'s `ALLOWED_PRACTICE_IDS` still only allows the disowned
   `DRIFT_PRACTICE_ID`** (§3). If item 1 above is resolved with a real practice mapping, this
   allowlist must be updated to match it in the same change — otherwise a newly-mapped practice's
   real completions would be rejected as `unsupported_practice`.
4. **No handoff contract exists for StreamK returning control to AvatarK** (§2) — today it's
   silent, same-repo navigation with no typed object, which is honest but leaves this one edge of
   the mission's own six-node chain without the same rigor the other four edges have.
5. **`RC4_ROUTE_CONTRACT.md`'s three "stop condition triggered" findings in `prometheusk-web`
   itself are still open**: it drops `returnTo`/`witness`/`intention` query params on load (no
   canonical return contract), runs on a fully separate Supabase project (no journey
   synchronization beyond the one narrow `practiceCompletedAt` flag RC5 added), and has no
   unauthenticated-safe Living Echo preview route. These are `prometheusk-web`-side fixes, outside
   this repo, but they cap how much richer the AvatarK→Prometheus relationship can get without
   coordinated cross-repo work.

**Not included, deliberately:** ArenaK/StreamK/StudioK's lack of real implementation is not listed
as "debt to fix before AI.4" — building those integrations is a distinct, larger, unscoped effort
(per `docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md`'s own conclusion), not a defect in what
this repo has already built.

---

**Verification performed for this report:** `git log` on every frozen module (confirms no drift
since Phase 2/3 commits); `pnpm test` (268/268 passing); direct reads of
`practiceHandoff.ts`/`receipt.ts`/`prometheusk.ts`/`streamHandoff.ts`/`api/onboarding/begin`/
`continue`/`ContinueGate`; `.env.local` and `.env.example` diffed for cross-product config
presence; the product registry's current ArenaK/StreamK/StudioK entries read directly (not
assumed from older audit docs, several of which — Wave 1, RC1_CONFIGURATION_MATRIX — describe a
prior state that current code has since moved past, e.g. `lib/products/registry.ts` *does* now
read the `NEXT_PUBLIC_*_URL` env vars a stale doc claimed nothing reads). No code was modified.
