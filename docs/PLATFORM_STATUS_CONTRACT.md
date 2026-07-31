# Platform Status Contract (AvatarK Identity RC1, Part 15)

`lib/admin/platformStatus.ts` defines a shared status contract for seven platform items:

Identity · Google OAuth · Magic Link · Account · Product Registry · Invitations · Notifications

## Status values

`operational | degraded | unavailable | not_configured | unknown`

## Basis: static configuration checks, not live health checks

Every `PlatformStatusEntry` carries `basis: 'static_configuration_check'` as a non-optional field — not a footnote, a structural part of the type, so no caller can silently present this as uptime monitoring. `computePlatformStatus()` performs zero network calls, zero database round-trips, and zero external probes. It derives each status purely from the same configuration-presence checks `environment.ts`/`authDiagnostics.ts`/`emailDiagnostics.ts` already perform (Supabase URL/anon-key presence, the Google OAuth flag, the account-mount flag, product-registry population, etc). This matches the mission's explicit requirement: "Do not fabricate health checks. Static configuration checks must not be labeled live operational checks."

## Per-item derivation (today's rules)

| Item | operational | not_configured | unavailable | unknown |
|---|---|---|---|---|
| Identity | env healthy | — | env misconfigured | env state unknown |
| Google OAuth | flag on + credentials verified configured | flag off | — | flag on, credentials unverifiable |
| Magic Link | Supabase URL + anon key present | — | either missing | — |
| Account | `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED=true` + env healthy | flag off | flag on + env not healthy (degraded) | — |
| Product Registry | ≥1 product present | — | 0 products present | — |
| Invitations | dependency presence confirmed | — | — | presence unverifiable |
| Notifications | — | always (no delivery engine exists anywhere in the ecosystem yet) | — | — |

## Consumer rollup

`worstPlatformStatus(entries)` reduces the 7 entries to the single worst status, ordered `operational < not_configured < unknown < degraded < unavailable` — an honestly-disabled item (`not_configured`) is treated as a better signal than one that can't be verified (`unknown`), which is in turn better than a confirmed failure. Consumer-tier UI (`ConsumerDiagnostics.systemStatus` in `diagnosticsTiers.ts`, see [[SAFE_DIAGNOSTICS]]) may show only this rolled-up value. The per-item table above stays behind the `developer`/`platform_operations` tier.

## Non-goals

This phase does not add a status dashboard route, does not schedule periodic checks, and does not persist status history. It defines the contract, the derivation rules, and the rollup function only.
