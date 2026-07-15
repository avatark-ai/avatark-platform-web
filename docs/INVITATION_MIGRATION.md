# Invitation & Echo — Migration Decision Record (RC3)

**Decided:** 2026-07-15, ahead of the BITS Pilani convocation (2026-07-19).
Status: **accepted, implemented**.

## 1. Current ownership

| Capability | Owner today | Where |
|---|---|---|
| Landing, Meet Guide, Threshold, Orb, Borrow decision, Journey continuity | **AvatarK Platform** (this repo) | `app/`, `platform/foundation-20260714` |
| Practice runtime, Reflection, Evidence, Living Echo | **PrometheusK** | `prometheusk.avatark.io` |
| Invitation-token validation, Echo reveal, Borrow persistence *for the existing Echo product* (e.g. the seeded `revathi` card) | **Legacy avatark-web** | `avatark.ai` |

This repo's own `/enter/[token]` is a new, additive entry surface — it
does not read, redirect to, or otherwise touch legacy's real
`/enter/[token]` (the BITS chapter/reflection pilot) or `/echo/[slug]`
(the seeded Echo-card product). Both keep operating exactly as before,
unmodified, for whoever already uses them. Nothing about this decision
migrates their traffic or their data.

## 2. Why the legacy Echo/Borrow *runtime* is not reused

An RC3 route audit (2026-07-15) found that legacy's real Echo product
(`app/echo/[slug]`, `app/echo/borrow`, `lib/living-echo-runtime.ts` in
`avatark-web`) is a **fully self-contained system**: its own person
card (one hardcoded entry today), its own reveal gate, and — critically
— its own practice runtime ("The Threshold Breath Protocol," at
legacy's `/practice/threshold`). It never reaches PrometheusK.

RC1 already shipped a separate, hosted-verified pipeline that does the
opposite: Platform → `buildBorrowUrl` → PrometheusK's real practice
runtime → `/continue` → `/journey` (`lib/onboarding/prometheusk.ts`,
`docs/ONBOARDING_ROUTE_CONTRACT.md`, `docs/ONBOARDING_VERIFICATION.md`).

**Decision: the RC1 Platform → PrometheusK pipeline is the canonical
onboarding architecture, for every entry point** — public landing,
invitation, QR, and future entry points (Episode 000, future
practitioners). Legacy's Echo/Borrow/Threshold-practice runtime is
**historical** — a real, working, still-live system, but not the one
new work builds on. Its *concepts* (a person to meet, a reveal moment,
a borrow decision) are re-expressed natively in Platform as Meet
Guide → Threshold → Orb → Borrow; its *runtime* (legacy's own practice
pages) is not linked into by any new route.

This avoids every RC1-era stop condition: no new cross-project database
table, no cross-project authentication, no service-role communication
between `avatark-platform-web` and `avatark-web` or `prometheusk-web`.

## 3. Migration target

**AvatarK Platform** is the long-term home for invitation entry, Echo
preview ("Meet Guide"), and the borrow decision. Content today is a
single, explicitly generic placeholder ("a CEO of a major global
manufacturing company," no real individual named) — the content layer
(`lib/onboarding/guide.ts`) is deliberately swappable so a real,
consented practitioner (or several) can replace it without any route
or pipeline change.

## 4. Exit criteria for retiring the legacy Echo implementation

Legacy's `/echo/[slug]` + `/echo/borrow` + Threshold-practice runtime
can be retired once, **and only once**:

1. Platform has a real (consented, verified) practitioner content model
   replacing the single generic placeholder guide.
2. Any still-circulating links/QR codes pointing at legacy's `/echo/*`
   have either expired or been reissued pointing at Platform.
3. Legacy's `echoes` table has no unmigrated data anyone still depends
   on (or a decision has been made not to migrate it).
4. Product confirms no active campaign (e.g. a future VIP gift-card
   moment) still depends on legacy's bespoke card rendering.

Until then, legacy's Echo product is left fully intact and untouched.

## 5. Risks

- **Two "Echo"/"Journey" concepts now exist in parallel** (legacy's
  `living-echo-runtime.ts` journey steps vs. Platform's new
  `lib/journey/*`) with no shared data. A user who has an experience in
  legacy's Echo product and one in Platform's pipeline will see two
  unrelated histories. Not resolved here — flagged for whoever owns
  the eventual retirement.
- Platform's `/enter/[token]` does **not validate** the token against
  any database (by design — no cross-project DB access). Any string
  is accepted as an invitation identifier and carried forward as the
  `invitation` query param, purely for downstream attribution. This is
  intentionally soft; tightening it is a Platform-native follow-up,
  not part of this decision.
- The landing page's "Enter an Invitation" CTA still points at bare
  `/enter` (no token), which 404s — a pre-existing gap from RC1
  (`docs/ONBOARDING_ROUTE_CONTRACT.md`), unchanged by RC3. A bare
  entry with no token has no valid destination in either system.

## 6. Future migration phases

- **Phase 0 (this decision, 2026-07-15):** Platform-native Meet
  Guide/Threshold/Orb/Borrow, generic placeholder content, converging
  into the existing PrometheusK pipeline. Legacy Echo product
  untouched and still serving its existing use.
- **Phase 1 (post-BITS):** design real practitioner/content ownership
  in Platform (who authors a guide, consent model, storage) —
  explicitly out of scope for RC3 per direct instruction.
- **Phase 2:** once Phase 1 ships, retire legacy's Echo/Borrow/
  Threshold-practice runtime per the exit criteria above; redirect any
  remaining legacy `/echo/*` traffic to its Platform-native
  equivalent.
