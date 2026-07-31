# Deep Link Resolver

## What this is

`@avatark/navigation`'s `crossProductLinks.ts` — the shared vocabulary for six kinds of
content-shaped link named across the AvatarK ecosystem: **watch, practice, echo, arena, studio,
game**. It answers one question, consistently, for any caller: *which product does content of
this kind actually live on, and what's the real URL for a specific piece of it?*

This is deliberately **not** a replacement for `@avatark/journey`'s own `deepLinks.ts` (already
real, already shipped in an earlier phase). That module answers a narrower, different question —
"where is step X of *this repo's* nine-step Entry Engine journey" (`/enter`, `/watch-first`,
`/witness`, `/practice/{id}`, `/journey`). This one answers "which product owns content kind X,"
which for three of the six kinds happens to resolve to routes that module already names, and for
the other three resolves to a different product's domain entirely. The two packages solve
adjacent, not identical, problems — see `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md` for the general
discipline of not conflating same-shaped names across this codebase.

## The six kinds, and why three are local and three aren't

| Kind | Resolves to | `local` | Real today? |
|---|---|---|---|
| `watch` | This repo's own `/watch-first` (or `/watch-first/{slug}`) | `true` | `/watch-first` yes; `/watch-first/{slug}` no (prepared, not real — same honesty convention as `@avatark/journey`'s `watchFirstLink`) |
| `practice` | This repo's own `/practice/{id}` | `true` | Yes — `app/practice/[id]/page.tsx` is a real route today |
| `echo` | This repo's own `/echo/{slug}` | `true` | Yes — `app/echo/[slug]/page.tsx` is a real route today |
| `arena` | ArenaK's domain (`arenak.ai`) + path | `false` | Domain resolves; ArenaK's real implementation is not reachable from this repo (`docs/PLATFORM_CONTRACTS.md`'s Invitations section) |
| `studio` | StudioK's domain (`studiok.dt4m.ai`) + path | `false` | Domain resolves; no confirmed Platform integration |
| `game` | GameK's domain (`gamek.ai`) + path | `false` | Domain resolves; GameK is the most-integrated non-Avatar product (Phase 1 complete) |

**Why `watch`/`practice`/`echo` are local rather than resolving to another product's domain:**
those three routes are real, and already live in this repo, so a resolver that instead built a
cross-product URL for them would be inventing a redirect that doesn't reflect reality. `arena`,
`studio`, and `game` have no equivalent local route — this repo never renders Arena/Studio/Game
content itself — so those three always resolve outward.

## ⚠️ Disambiguation — read before using `practice` or `echo`

Both of these kinds collide, by name only, with a different ecosystem concept:

- **`practice`** resolves to *this repo's own* local `/practice/{id}` route — part of this repo's
  editorial "Echo" content model (`content/echo/practices/*.md`, e.g. `the-promise-to-myself`), not
  a redirect into PrometheusK. **Practices as an owned ecosystem concept belong to PrometheusK**
  (`docs/PLATFORM_CONTRACTS.md`: "AvatarK does **not** own: Practices (PrometheusK)"). The real
  cross-repo handoff for *that* concept already exists, under a different name: `@avatark/journey`'s
  `StreamKToPrometheusHandoff` (`packages/journey/src/handoffContracts.ts`). This resolver's
  `practice` kind is a local content browsing link, not that handoff — do not conflate the two.
- **`echo`** resolves to *this repo's own* editorial Echo content (`/echo/[slug]`) — never Living
  Echo, PrometheusK's recorded practice trace. See `docs/PLATFORM_CONTRACTS.md`'s Living Echo
  section for the full three-way "Echo" / "Living Echo" / "`/my/echo`" disambiguation this resolver
  inherits verbatim.

## API

```ts
import { watchLink, practiceLink, echoLink, arenaLink, studioLink, gameLink, parseLocalDeepLinkPath } from "@avatark/navigation"

watchLink("the-returner")        // { kind: "watch", local: true, path: "/watch-first/the-returner", href: "/watch-first/the-returner", productId: "avatark" }
practiceLink("the-promise-to-myself")
echoLink("the-returner")

arenaLink("/cohort/abc")         // { kind: "arena", local: false, productId: "arenak", href: "https://arenak.ai/cohort/abc" }
studioLink()                     // href: "https://studiok.dt4m.ai/"
gameLink("/flowk")               // href: "https://gamek.ai/flowk"

parseLocalDeepLinkPath("/practice/the-promise-to-myself")
// { kind: "practice", rest: "the-promise-to-myself" }
```

`href` is `null` on a cross-product kind only when the target product's domain can't be resolved —
never a guessed host (see `@avatark/navigation`'s Redirect Manager, `docs/CROSS_PRODUCT_INTEGRATION.md`).

**Parsing is local-only.** `parseLocalDeepLinkPath` recognizes `watch`/`practice`/`echo` because
those are real incoming pathnames this repo might need to classify (e.g. for journey/analytics
tracking). `arena`/`studio`/`game` are outbound-only from this repo's point of view — there is no
incoming pathname of this app's own to parse against another product's route space.

## Known gaps

- `/watch-first/{slug}` has no real dynamic route yet — `watchLink(slug)` returns an honest,
  non-fabricated `path`, but nothing resolves it today (same gap `@avatark/journey`'s
  `watchFirstLink` already documents).
- No incoming-request validation exists for `arena`/`studio`/`game` links — this resolver only
  *builds* those URLs; it has no way to confirm the target route exists on the other product's side,
  since none of those three repos are reachable from this workspace.
- `parseLocalDeepLinkPath` is not wired into any real route handler or middleware yet — it's a pure
  function, exercised only by its own tests.
