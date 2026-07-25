# Echo Route Map

Status: implemented, feature/echo-avatark-complete-experience. Reconciles
the mission's proposed route map against what actually exists in this
repo, per route, with a reason.

## Public

| Route | Disposition | Reason |
|---|---|---|
| `/` | **Implemented, host-gated** | `app/page.tsx` calls `resolveSite()` (`lib/sites/resolveSite.ts`); renders `EchoLanding` on `echo.avatark.ai`/`next.avatark.ai`, the existing `InstitutionalShell` otherwise. Single branch point, no other route needed host awareness. |
| `/start` | **Reused, transformed** | Was the RC1 intention picker directly; now the spec's "Start Here" triage screen (Have an Invitation / Show Me an Example / Help Me Choose / already a member). |
| `/start/choose` | **New** | The former `/start` intention picker, moved here, now resolving its practice recommendation through `pickPracticeForIntention()` instead of a hardcoded slug. |
| `/enter`, `/enter/[token]` | **Reused, reskinned** | Attribution-only by explicit prior decision (`docs/INVITATION_MIGRATION.md` — no cross-project DB access). Copy updated to Echo framing; `/enter/[token]`'s destination Echo now resolves generically via the content registry instead of one hardcoded slug. Expired/already-accepted states are **not** implemented — no backing store exists to know either honestly; fabricating them was rejected. |
| `/watch-first` | **Implemented** | Truthful preview state (no story content authored yet) with a real practice handoff. |
| `/watch/[episode]` | **Deferred** | No per-episode data model was needed to ship a real Watch First — `content/echo/stories/*.md` (via `/discover#stories`, `/stories`) is the generic story surface; a per-slug watch route can be added the same way `/practice/[id]` was once episode content exists, without new architecture. |
| `/discover` | **Implemented** | Collection-driven over `lib/content/echo.ts` (Echoes, Practices, Stories, Collections), with a real (not example) theme-chip filter and anchors matching the nav (`#echoes #practices #stories #collections #themes`). |
| `/echo/[slug]` | **Implemented** | Overview/Practices/Stories/Evidence/Lineage tabs; Evidence and Lineage render honest empty states (no local evidence/lineage data exists) rather than being omitted. |
| `/practice/[id]` | **Implemented** | Local preview (title, purpose, duration, modality, source Echo, what/why) + Begin Practice, handing off through the existing `/api/onboarding/begin` → PrometheusK route — the same canonical handoff `/witness/[slug]` already used. |
| `/community` | **Implemented** | Real components, anchored sections (`#challenges #groups #events #cohorts #recognition`) matching nav/footer; honest empty states, no local ArenaK data, real attribution link via the product registry. |
| `/stories` | **Implemented** | Real components (`#watch #episodes #live #films #creators`); honest empty states, real attribution links (StreamK, CinemaK) via the product registry. |

## Authenticated

| Route | Disposition | Reason |
|---|---|---|
| `/today` | **Implemented** | New route group `app/(echoJourney)/`, sharing the existing `JourneySessionProvider` (no new session logic). Reuses `getContinuityAction`/`getIntentionLabel`. Coexists with the pre-existing `/journey/today` (not deleted — see below). |
| `/my/echo` | **Implemented** | Overview/Timeline/Practices/Reflections/Evidence/Contributions tabs over `JourneyContext`; the mission's own suggested beginning-state copy ("Your Echo begins with one practice and one reflection") where there's little history yet. |
| `/my/echo/living-preview` | **Implemented** | One honest, non-fabricated observation when both an intention and a completed practice exist ("that's one real data point, not yet a pattern"); an honest "not enough history yet" state otherwise. No mysterious score, no diagnosis language. |
| `/my/journal` | **Implemented** | Filters (All/Practices/Stories/Decisions/Contributions); exactly one real entry type exists today (a practice-completion event derived from `JourneyContext.practiceCompletedAt`) — free-text note persistence is **not implemented** (no local backend for it; reflection text itself lives on PrometheusK) and is flagged as a named follow-up, not silently faked. |
| `/my/journey` | **Implemented** | "Your journey is not a score" framing, an Invitation→Story→Practice→Reflection→Contribution stage tracker driven by real `JourneyContext` fields, no vanity metrics. Coexists with the pre-existing `/journey/history` (not deleted). |
| `/echo/create` | **Implemented** | 3-step flow (theme → kind of beginning → one suggested path), resolving into the same real practice registry Start Here and Discover use. |
| `/account` | **Reused, untouched** | No changes. |

## Practice runtime

**Cross-product, unchanged.** `lib/onboarding/prometheusk.ts`'s
`buildBorrowUrl`/`buildContinueUrl`, called through
`/api/onboarding/begin`, is the one and only practice-runtime handoff in
this repo. `/practice/[id]` and `/witness/[slug]` both route through it. No
second runtime was built.

## Existing routes touched or left alone

| Route | What changed |
|---|---|
| `/guide/[slug]` | Generalized: any Echo slug now resolves via `getGuide()`/`getEchoBySlug()` instead of one hardcoded `GUIDE_SLUG` check. Same URL, same behavior for `the-returner`. |
| `/witness/[slug]` | Generalized the same way, via `getPracticeBySlug()`. Narrative copy now comes from the practice record instead of being hardcoded in the page. |
| `/continue` | Copy updated to "Practice Complete" / "Added to Your Echo"; its signed-in CTA now continues to `/today` (with a "View My Echo" link added) instead of the old bare `/journey`. Receipt verification logic itself is untouched. |
| `/journey`, `/journey/today`, `/journey/history`, `/journey/settings` | **Left running, not redirected.** These are the RC5 onboarding contract's documented landing points (`docs/RC5_HANDOFF_CONTRACT.md`); redirecting them without re-verifying that contract end-to-end was judged higher-risk than harmless coexistence. `/today` and `/my/journey` are the new, Echo-branded, equally-functional destinations that new work (including `/continue`) points at going forward. Consolidating the old paths is a reasonable follow-up once that contract doc is revisited. |
| `/start`, `/enter` | See "Public" table above. |

## Not part of this pass

- **Search** — not implemented anywhere (Discover, header). Per instruction, omitted rather than faked.
- **Notifications** — not implemented. Omitted.
- **Recommendations** (as a distinct nav destination separate from Today) — folded into Today's real recommendation instead of a second, thinner page.
- **Saved Stories / sharing** — no persistence backend exists; not added as a non-functional button.
