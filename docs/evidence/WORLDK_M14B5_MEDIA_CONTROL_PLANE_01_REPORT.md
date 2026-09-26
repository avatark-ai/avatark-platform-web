# WORLDK-M14-B5 — GPU-Independent Media Control Plane

**Date:** 2026-09-26/27
**Environment:** Cloud Workstation only (no GPU, no Unreal, WRK-01 untouched, GCP L4 PARKED)
**Lane:** Platform (`avatark-platform-web`, branch `feature/worldk-p11b-platform-preview-provisioning`)
**Implementation:**
- `a43ff86`, plus the build fix `853a6b0`
- both pushed, together with the accepted B5 recon report `1da8d3e`

**Preview:**
- DB: migration 045 applied at 23:35:35Z (checksum `6356e5b7…`)
- Platform Preview: **`dpl_CdUikDPeJ9QEuGPCJcatZA4wxtPE`**, READY, aliased to `platform-preview.avatark.ai`
- One intermediate deployment **failed to build** (`dpl_ArXxSFYp…`, see §11). The alias never moved to it.

**Production:** untouched, still `dpl_FdYo7Sr2mq9322hgQkzqtvwa18kW`.
**Classification:** `M14B5_MEDIA_CONTROL_PLANE_CERTIFIED` (scope and limits in §13)

**Frozen chain, preserved and proven end to end:**

```
ENTER → allocation → RuntimeSession → CLAIM → B3 capability → AUTHORIZED → B4 ATTACH
      → MEDIA_ESTABLISHED → STREAM_JOINED → ARRIVAL → IN_WORLD
```

None of these ever caused ARRIVAL: CLAIM, ATTACH, WebSocket connected, playerConnected or ICE connected. Only a certified MEDIA_ESTABLISHED causes `STREAM_JOINED`, and it happens exactly once.

---

## 1. Upstream packages, provenance and licence review
All of this is recorded in `services/worldk-signalling/PROVENANCE.md` and `THIRD_PARTY_NOTICES.md`.

| Package | Version (exact pin) | Licence | Integrity |
|---|---|---|---|
| `@epicgames-ps/lib-pixelstreamingsignalling-ue5.8` | **0.2.0** (tag `lib-pixelstreamingsignalling-ue5.8-0.2.0`, 2026-08-17) | MIT | `sha512-BDRGuNG2…zTA==` |
| `@epicgames-ps/lib-pixelstreamingcommon-ue5.8` | **0.1.0** | MIT | `sha512-Za+1lC0M…mhxA==` |
| `ws` | **8.22.0** | MIT | `sha512-Ydggc987…DOg==` |

- **Source:** EpicGamesExt/PixelStreamingInfrastructure, branch **UE5.8** (the "Current" branch). `master` is experimental and is **not** tracked.
- **Upstream licence:** `LICENSE.md` on UE5.8 is standard MIT, "Copyright Epic Games, Inc." (verified). The npm tarballs contain no LICENSE file, so the notice is reproduced in `THIRD_PARTY_NOTICES.md`.
- **Transitive dependencies:** 124 packages, all permissive: 119 MIT, 3 ISC, 1 BSD-3-Clause, 1 Apache-2.0 AND BSD-3-Clause. No copyleft.
- **Install isolation:** installed with `--ignore-scripts` into the service's own `package-lock.json`. This is outside the pnpm workspace and outside the Next build (tsconfig `exclude`, eslint `ignores`), and `services/*/node_modules` is gitignored.
- **Smallest surface used:**
  - Epic `StreamerConnection`, `StreamerRegistry` (with its `authorizeStreamerId` hook) and `PlayerRegistry`, used unchanged.
  - From the Common library: `SignallingProtocol`, `WebSocketTransportNJS`, `MessageHelpers` and `Messages`.
- **Deliberately not used:**
  - Epic's `PlayerConnection`. It answers `listStreamers`, honours `subscribe` to any id, and **auto-subscribes an unsubscribed player to the first streamer**, which violates the owner freeze on browser choice.
  - Epic's `SignallingServer` and Wilbur web server.
  - The Matchmaker (deprecated) and SFU (experimental).
  - The shipped coturn scripts (hard-coded default credentials).
  - The Frontend library 0.1.2 (evaluated, not adopted). It self-enumerates and self-subscribes, and it cannot put the authorization in the WebSocket subprotocol list.
- **JSStreamer** was used as the *approach* for the mock streamer. No Epic file was copied.

## 2. Architecture implemented
| Component | Where | Role |
|---|---|---|
| **Signalling service** (logical T1, Platform-controlled; renderers dial out) | `services/worldk-signalling/src/server.ts` | Authorization admission, Platform route resolution, server-side routing, an offer gate (attach-before-offer), relay-only filtering, and ephemeral peer configuration. It holds **no DB credential**, writes **no lifecycle**, and logs nothing sensitive (Epic logging silenced). Hosted locally for B5; physical hosting is **not frozen** and is **not** inside Vercel. |
| **Platform route authority** | migration **045** + `POST /api/signalling/v1/route` (`lib/worldEntry/signallingRoute.ts`) | Given `sha256(authorization)` from signalling, which authenticates with a signalling key, it returns an **opaque route key** plus `attached`. The endpoint is read-only. |
| **Media player page** | `GET /world-entry/stream/media` (`lib/worldEntry/mediaPlayerPage.ts`) | B3 capability, then AUTHORIZED, then a WebSocket to the signalling origin with the authorization **in the subprotocol list** (never the URL), then real WebRTC. Once `framesDecoded > 0` and `<video>` is `playing`, it sends one nonce-bound first-frame ack. It never enumerates or selects anything. The CSP pins the script by hash; `connect-src` is `'self'` plus the signalling origin. |
| **MEDIA_ESTABLISHED machine** | `lib/worldEntry/mediaEstablishment.ts` | The frozen rule (§5), pure and clock-injected. |
| **Mock render worker** (RuntimeInstance = one render process + its RuntimeBridge) | `lib/worldEntry/testing/mockRenderer.ts` | Node side: the B2 `ReferenceRuntime` (runtime credential), B4 attach, the nonce and the state machine, which produce `STREAM_JOINED`/`STREAM_LOST`. Chromium side: one streamer WebSocket per claimed session, a real `RTCPeerConnection` and a canvas test-pattern video. It **offers only after ATTACHED**. |
| **Local coturn** | coturn 4.6.1 (apt), started per test run | `use-auth-secret`, no TLS, loopback-only allowed-peer. Used for relay proofs only. **No public TURN** was provisioned. |

**Frozen B1/B2/B3/B4 files are unchanged:**
- the B1 protocol, spec, schemas and fixtures
- the B2 SDK package
- migrations 040–044
- the B3/B4 handlers and routes (`streamCapability.ts`, `runtimeIngress.ts`, `stubAttachmentRelay.ts`)
- `gateway.ts`

The staged diff over those paths is empty. The only additive change to shared code is `ReferenceRuntime.attachStreamDigest`, which lets the renderer attach with the digest signalling relays, so it never holds the plaintext.

## 3. Signalling authority boundary
- **What signalling can do:** refuse; route a player to exactly the Platform-routed streamer; forward the answer and ICE to that streamer only; forward the renderer's offer only after the Platform confirms attachment; drop non-relay candidates; mint TURN credentials after admission.
- **What signalling cannot do:**
  - choose a route (the Platform does)
  - attach (only the allocated renderer's runtime credential can)
  - produce any lifecycle fact (only the renderer's bridge, through ingress)
  - read the DB, or see the plaintext authorization beyond the upgrade request (it forwards only the digest)
- **Proven:** signalling-only events (refused handshakes, enumeration attempts, disconnects) left the **full public-schema digest identical** (G18).

## 4. Route authority (045) and attach-before-offer
**045** is `world_stream_signalling_route(authorization_sha256)`. It is SECURITY DEFINER and STABLE, runs under the M14 Platform gate, adds **no table**, and never writes.
- **Admission** requires the authorization to be consumed, inside the 60 s attach window, and not yet attached; no other authorization attached to the session; and the session stream-eligible.
- **Offer gate** requires `attached = true`, the same route and continued eligibility.
- **The route key** is `wkr1-` plus the first 40 hex of sha256("worldk-stream-route:v1:" + session id). It is **not** the session id, holding it grants nothing, and TS/SQL parity is tested.
- **Grants:** EXECUTE only to `worldk_platform_entry_authority`. The key helper cannot be executed by anyone.

**Attach-before-offer, enforced twice:**
1. The renderer attaches (B4) on `playerConnected` and offers only if the result is `ATTACHED`. The renderer log order is `PLAYER_CONNECTED → ATTACH → OFFER_SENT`.
2. **Signalling independently** re-checks with the Platform before forwarding any offer. A rogue renderer that squatted the route key and offered without attaching was **blocked** (`OFFER_BLOCKED NOT_ATTACHED`), and the player never received an offer (G5).

## 5. MEDIA_ESTABLISHED state machine (frozen)
`MEDIA_ESTABLISHED(session)` requires **all** of the following within **30 s** of ATTACHED:
1. B4 ATTACHED (construction).
2. ICE connected/completed.
3. The data channel open.
4. The browser proves consumption: `framesDecoded > 0` **and** `playing`.
5. One ack over that peer's channel.
6. The ack carries this attachment's nonce: 32 random bytes, compared in constant time.
7. The renderer validates the nonce.
8. **Renderer-side corroboration:** its own outbound `framesSent > 0` **and** an RTCP receiver report (`remote-inbound-rtp`) from the browser.

The corroboration requirement means a browser ack alone never suffices.

**After join:**
- `failed`/`closed` gives `STREAM_LOST` immediately.
- `disconnected` gives `STREAM_LOST` only if still disconnected **10 s** later.

**Before join:**
- `failed`/`closed`, or the window elapsing, gives `MEDIA_FAILED`, with **no fact at all**.
- A wrong nonce is a terminal `MEDIA_FAILED` (fail closed).

`STREAM_JOINED` and `STREAM_LOST` are each emitted at most once. There is no second lifecycle: these map to B1 `STREAM_JOINED` (arrival) and `STREAM_LOST` (disconnect, grace) through the unchanged SDK and ingress.

## 6. Certification results (owner gates 1–23)
**End-to-end** (`mediaControlPlane.e2e.test.ts`, 11/11):
- real Chromium 151, real WebRTC with a canvas test pattern
- the real signalling service, real Platform handlers and real Postgres (037–045)
- local coturn

| # | Gate | Result |
|---|---|---|
| 1–4 | No, forged, expired or replayed authorization → no offer | Refused at the WebSocket upgrade (reasons `NO_AUTHORIZATION`, `NOT_ROUTABLE`, `AUTHORIZATION_REUSED`). No `config` and no offer were ever sent. Replay across a restarted signalling server gives `ALREADY_ATTACHED`. |
| 5 | Wrong renderer → no offer | A squatter blocked the legitimate registration, but it could not attach (0 attachments), and its unattached offer was **blocked by signalling**. A wrong renderer with its own credential gets `SESSION_NOT_BOUND`. |
| 6 | Browser cannot enumerate or select | `listStreamers`, `subscribe` (to another visitor's route key) and `unsubscribe` were ignored. No `streamerList` was sent, and the other session's renderer was never reached. |
| 7, 8 | WebSocket connected / playerConnected alone | The renderer saw `PLAYER_CONNECTED → ATTACH → OFFER_SENT`, ICE stayed `new`, the phase stayed `ESTABLISHING`. **No STREAM_JOINED, no presence row.** |
| 9 | ICE connected alone | ICE `connected`, data channel open, no ack: **not joined**. |
| 10 | ATTACHED without a decoded frame | The renderer sent no video. The honest browser never acked (`ackAccepted:false`). A malicious early ack was accepted as an ack but `rendererFlowing:false`, so **not joined**. |
| 11 | Wrong or replayed nonce | A reversed nonce, or a nonce from another peer, gives `MEDIA_FAILED NONCE_INVALID`, **not joined**. |
| 12, 13 | Full MEDIA_ESTABLISHED → exactly one STREAM_JOINED → exactly one VISIT_OPENED | Joined **2.8 s** after Connect. One `STREAM_JOINED` (`VISIT_OPENED`), one lifecycle `CONFIRMED_ARRIVAL`, `visit_count` 1. The status page shows "You are in…". |
| 14 | Reconnect inside grace | Refresh gives `STREAM_LOST` (`GRACE_RUNNING`). Re-entry gives a new RuntimeSession on the same Visit, then media again, then `SESSION_RESUMED`. Arrivals stay at 1 and `visit_count` at 1. |
| 15 | Transient ICE disconnect < 10 s | The TURN relay was paused (SIGSTOP) and ICE went `disconnected`. It was resumed after 2 s and ICE recovered in **2.2 s**. After 12 s more: **no STREAM_LOST**. |
| 16 | failed/closed, or disconnected > 10 s | A sustained pause gave `STREAM_LOST ICE_DISCONNECTED_10S` at **10.02 s**, outcome `GRACE_RUNNING`, with the Visit still open. Closed (refresh) gives an immediate `STREAM_LOST` (gate 14). |
| 17 | Pre-join media failure → no ARRIVAL | No ack gives `MEDIA_FAILED MEDIA_ESTABLISHMENT_TIMEOUT` at 30 s, with no fact and no presence. **Re-admission of that session was refused** (B4 one-attach): a retry requires re-entry. |
| 18 | Signalling-only events mutate nothing | The full public-schema digest was identical across refused, unauthorized and missing-subprotocol handshakes, with the renderer's own polling paused. |
| 19 | Local TURN relay-only | Two players. Both renderer-selected pairs were **relay ↔ relay**, and both reached `STREAMING`. |
| 20 | TURN credentials ephemeral and absent | Credentials were minted per admitted player (2 players, 2 distinct username/credential pairs), with a TTL of 300 s and `HMAC-SHA1(secret, username)`. **None were minted for refused players.** A scan of every B5 DB dump, the Postgres server log, the full-suite and browser logs and the evidence for all 3 TURN credentials, the TURN secret and both service keys found **0 hits**. |
| 21 | Browser learns no identity | Nothing the browser received (HTTP bodies and every signalling frame) contained the instance, session, visit, allocation or subject id, the **route key**, or either service key, and there were no `streamerList`, `endpointId` or `playerCount` frames. In relay mode **every** candidate the browser received was `typ relay`. Host and srflx candidates are stripped by signalling (unit test, mutant S3). |
| 22 | Real Chromium + real WebRTC + fake media end to end | All of the above. |
| 23 | M14 A/A5/B1/B2/B3/B4 regressions | §9 |

**Other suites:**
- Signalling unit (`services/worldk-signalling/src/server.test.ts`, 8/8, raw WebSocket clients): TURN minting, ICE filtering, the route client, anti-squat and key checks, admission (digest-only, single use, config only after admission, plaintext never sent to the renderer), the offer gate (including buffered candidates not leaking, a duplicate offer dropped, route mismatch), relay filtering, and enumeration.
- State machine (10/10, exact 30 s and 10 s boundaries).
- 045 real Postgres (3/3): parity, admission then offer gate, refusals, privileges, read-only.
- Route endpoint and media page unit (5/5).

## 7. WebRTC and TURN evidence
Source: `docs/evidence/worldk-m14b5/e2e-proofs.json`.
- Time to STREAM_JOINED was 2.8 s.
- Relay pairs were `{local: relay, remote: relay}` × 2. The browser saw 3 candidates, all relay.
- The ICE debounce figures are transient 2202 ms (no loss) and sustained loss at 10024 ms.
- `nonRelayCandidatesDroppedBySignalling: 0` in the end-to-end run, because the renderer itself is relay-only in relay mode. The filter is proven by the unit test and mutant S3.

## 8. Mutation / adversarial results (18 mutants; source byte-compared after each)
17 were killed and 1 was equivalent.

| Mutant | Result |
|---|---|
| S1 no offer gate | killed |
| S2 admit an attached authorization | killed |
| S3 no relay filter | killed |
| S4 answer `listStreamers` (Epic stock behaviour) | killed |
| S5 authorization reusable | killed |
| S6 no Platform route check | killed |
| **S7 streamer-squat check removed** | **survived: equivalent.** Epic's `StreamerRegistry` independently refuses an id already in use and disconnects the squatter, so our check is defence in depth. |
| S8 plaintext authorization forwarded to the renderer | killed |
| M1 no renderer corroboration | killed |
| M2 nonce unchecked | killed |
| M3 no 10 s debounce | killed |
| M4 no 30 s window | killed |
| M5 data channel not required | killed |
| M6 STREAM_JOINED repeatable | killed |
| R1 045 no window | killed |
| R2 045 anon EXECUTE | killed |
| R3 045 no eligibility | killed |
| R4 045 second authorization per session | killed |

**Adversarial end-to-end cases:** the rogue squatter, the early-ack browser, wrong and cross-peer nonces, replay after a server restart, and TURN pauses.

## 9. Regression
| Suite | Result |
|---|---|
| **`pnpm test` (full)** | **1990 pass / 0 fail / 4 skipped of 1994.** The skips are the optional PostgREST stack and 3 A5 cron tests that need a cron DB. |
| A5 with pg_cron | 7/7 |
| **`pnpm test:browser`** (A3 Leave, B3, B4, B5 end-to-end) | **17/17** (with `M14B5_TURN_IP` and coturn) |
| `pnpm test:signalling` | 8/8 |
| B1/B2 protocol, bridge, SDK equivalence | pass (inside the full run; files unchanged) |
| tsc (root) / `tsc -p tsconfig.b5-e2e.json` / service tsc / eslint / `next build` | clean. The build lists `ƒ /api/signalling/v1/route` and `ƒ /world-entry/stream/media`. |
| **Vercel-equivalent build** (service `node_modules` removed) | root tsc and `next build` pass (see §11) |
| Secret scan (staged) / run-secret scan (DB dumps, Postgres logs, test logs, evidence) | 0 / 0 hits |

## 10. Disclosure audit
- **Browser-visible values:** the Platform pages; the opaque capability and authorization (B3); its own player id (`PlayerN`, assigned by signalling); SDP. In relay mode the SDP carries only relay candidates, whose addresses are the TURN relay's, which is Platform infrastructure.
- **Never browser-visible:** instance, session, visit, allocation and subject ids; the route key or streamer id; renderer host, port or IP (in relay mode); service keys; TURN credentials other than its own ephemeral pair.
- **Direct mode** (local certification only, owner-permitted) necessarily exposes host candidates. It is not a production mode.
- **The authorization travels in the WebSocket subprotocol list**, never in URLs or logs. Only its digest leaves signalling.

## 11. Preview state
- **045:**
  - The pre-snapshot matched pre-044 exactly.
  - It was applied in one transaction together with its runner-format ledger row.
  - The post-apply lifecycle digest is **unchanged**.
  - Audit: only the authority role can EXECUTE the resolver; anon, authenticated, service_role and the credential role cannot; the key helper cannot be executed by anyone; no new table.
  - Evidence: `worldk-m14b5/preview-*.json`.
- **Deployments:**
  - **`a43ff86` → `dpl_ArXxSFYpNHkKAo46J8HfdJZd5sXY` failed to build.**
    - Cause: Next's type-check followed the B5 end-to-end test's import into `services/worldk-signalling`, whose own dependencies (`ws`) are not installed by the Platform build.
    - My local build passed only because that directory's `node_modules` existed. The build verification gap is now closed.
    - The alias stayed on the previous healthy deployment throughout.
  - **Fix `853a6b0`:** that one test is excluded from the root tsconfig and typechecked via `tsconfig.b5-e2e.json`. It was verified with the service `node_modules` removed.
  - **`dpl_CdUikDPeJ9QEuGPCJcatZA4wxtPE`** is READY and aliased.
- **Deployed probes** (no bypass, no WorldK, no real session; raw output in `worldk-m14b5/preview-deployed-probes.txt`):

  | Probe | Result |
  |---|---|
  | route endpoint, no key / guessed key | 401 / 401 |
  | route endpoint, GET | 405 |
  | media page, no cookie | 404 |
  | **media page, forged cookie** | **503 "media plane not configured"**: honest, because no signalling origin is configured on Preview |
  | B4 attach, no bearer | 401 |
  | B3 issue, forged session | 403 |
  | B3 stream page / session page, no cookie | 404 / 404 |
  | unauthenticated ingress poll | 401 |
  | Production route / media page | 404 / 404 |

- **After the probes:** 0 capabilities, 0 attachments, lifecycle digest **unchanged**.
- **No Vercel environment change.** The signalling service is not deployed anywhere. `WORLDK_SIGNALLING_KEY` and `WORLDK_SIGNALLING_URL` are unset on Preview, so both B5 Platform surfaces fail closed.

## 12. Diff
**`a43ff86`** (32 files, +4205/−4):
- **Migration:** 045.
- **Service:** `services/worldk-signalling/**` (src, tests, package, lockfile, provenance, notices, tsconfig).
- **Platform code:** `signallingRoute.ts`, `mediaPlayerPage.ts`, `mediaEstablishment.ts`, `testing/mockRenderer.ts`, and the two routes.
- **Tests:** the state-machine, route and 045 suites, and the end-to-end suite.
- **Additive edits:** `authorityDb.ts` (one method), `deps.ts`, `referenceRuntime.ts` (one method), `machineIngress.ts` (two paths), the runner, `package.json`, `.gitignore`, the tsconfig/eslint excludes.
- **Evidence:** `docs/evidence/worldk-m14b5/e2e-proofs.json`.

**`853a6b0`:** tsconfig exclude, plus `tsconfig.b5-e2e.json` and the `typecheck:b5-e2e` script.

## 13. Remaining gaps and M15 inputs
- **Positive path not run on the deployment.** Signalling, the renderer and TURN are local-only by owner decision. The deployed proof covers the Platform surfaces failing closed, the 045 privileges and state isolation. The positive chain is certified locally with the production handler code.
- **Real Unreal Pixel Streaming 2 does not natively:**
  - read the custom `playerConnected.worldk.authorizationSha256` field, or call `attach`;
  - open a second named data channel;
  - speak our JSON nonce/ack. PS2 uses UIInteraction/Response binary messages.

  M15 needs a bridge sidecar or plugin hook that performs attach-before-offer, and a mapping of nonce/ack onto PS2's data-channel protocol and its `OnDataTrackOpen`/stats delegates. The *rule* is frozen; the *transport* is M15.
- **Signalling hosting is not frozen.** The streamer port must stay non-public. The shared streamer key is defence in depth, and route authority remains the Platform's.
- **Single-admission memory is per process.** After a restart, an attached authorization is refused by the Platform (proven). An unattached one could be admitted once more inside its 60 s window, but it still cannot attach twice.
- **TURN over TLS/443, public relay placement, the provider and cost** are M15/deployment decisions. The Epic shipped scripts must not be used.
- **B6 (renderer world-state read)** is reserved and not started. B5 renders a test pattern only.
- **Retention:** capabilities and attachments are still never purged (open since B3).
- **Test harness lesson:** Chromium 151's Local Network Access checks refuse loopback WebSockets from `about:blank`, so the mock media engine is served from a loopback origin. Relay tests need `M14B5_TURN_IP` set to a non-loopback local IPv4 and `turnserver` installed.

## 14. STOP
Not done:
- no Unreal
- no WRK-01 GPU work
- no GCP L4
- no public TURN and no vendor selected
- no Production deploy
- no WorldK change
- no world-state read and no B6
- no M15
- no GPU/process density frozen

```
M14B5_MEDIA_CONTROL_PLANE_CERTIFIED
```
