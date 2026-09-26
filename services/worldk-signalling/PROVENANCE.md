# worldk-signalling — upstream provenance and licence review (WORLDK-M14-B5)

Reviewed 2026-09-26. Pinned exactly (no ranges, no `master`). Installed with
`npm install --ignore-scripts` into this directory's own `package-lock.json`;
this package is outside the pnpm workspace and the Next build (root
`tsconfig.json` excludes `services`, eslint ignores `services/**`).

## Incorporated upstream packages (direct dependencies)

| Package | Version | Licence | Tarball integrity (package-lock) |
|---|---|---|---|
| `@epicgames-ps/lib-pixelstreamingsignalling-ue5.8` | 0.2.0 | MIT | `sha512-BDRGuNG2HR9Tua2dbkPu1r8pZxsyymKhB17BfD51/npc91GuR7/bqrb23AJbA0Zy14p+L2Hxk9YPerSLIk/zTA==` |
| `@epicgames-ps/lib-pixelstreamingcommon-ue5.8` | 0.1.0 | MIT | `sha512-Za+1lC0MotucgSRBkCnRx4KSGXJAe2E6AcdJIGsG1SKa51sOIYtvACwIQ31C5SF6fUZiHwBk06JixfHmRkmhxA==` |
| `ws` | 8.22.0 | MIT | `sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg==` |

- Source: https://github.com/EpicGamesExt/PixelStreamingInfrastructure, branch `UE5.8` (the repo's "Current" branch; `master` is "experimental" and is NOT used). Release tag `lib-pixelstreamingsignalling-ue5.8-0.2.0` (2026-08-17).
- Licence: the repository's `LICENSE.md` on `UE5.8` is the standard MIT licence, "Copyright Epic Games, Inc." (verified 2026-09-26). Both npm packages declare `"license": "MIT"` but their tarballs contain no LICENSE file; the notice is therefore reproduced in `THIRD_PARTY_NOTICES.md`.
- Transitive tree: 124 packages — 119 MIT, 3 ISC, 1 BSD-3-Clause, 1 (Apache-2.0 AND BSD-3-Clause). All permissive; no copyleft.

## What is used, and what is not

Used unchanged (imported, not copied): `StreamerConnection`, `StreamerRegistry`
(with its `authorizeStreamerId` hook), `PlayerRegistry`, `Logger` (silenced);
from Common: `SignallingProtocol`, `WebSocketTransportNJS`, `MessageHelpers`,
`Messages`, `overrideLogger`.

Deliberately NOT used:
- Epic's `SignallingServer` / `PlayerConnection` — `PlayerConnection` answers
  `listStreamers` with every streamer, honours `subscribe` to any streamer id,
  and `sendToStreamer` auto-subscribes an unsubscribed player to the first
  streamer. Each violates the owner freeze "browser must not enumerate/select a
  renderer"; they are replaced by `AuthorizedPlayer` in `src/server.ts`.
- Epic's `SignallingWebServer` ("Wilbur"), `WebServer`, Matchmaker (deprecated),
  SFU (experimental), and the shipped coturn scripts (hard-coded default TURN
  credentials, no TLS).
- `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8` (0.1.2) was evaluated and
  not adopted for B5: its connection controller sends `listStreamers`/
  `subscribe` itself and opens its own WebSocket (no way to carry the
  authorization in the subprotocol list). The B5 player page uses the same
  Epic signalling message shapes (`config`, `offer`, `answer`, `iceCandidate`,
  `ping`/`pong`) with standard `RTCPeerConnection` code. Revisit in M15 if
  UE's data-channel protocol (UIInteraction/Response) is adopted.
- JSStreamer (`Extras/JSStreamer`): used as the *approach* for a GPU-free mock
  streamer (`lib/worldEntry/testing/mockRenderer.ts`); no Epic file is copied.
