# Account Organization Invitation Integration

**Scope:** integrating organization invitation acceptance and organization
membership into the canonical AvatarK Account → Organizations section.
Products/admin surfaces still create invitations; this pass adds the
missing piece — a signed-in user's own path to accept, decline, or leave.

## 1. Ownership

- **Products/admin surfaces create invitations.** `POST
  /api/admin/organizations/[id]/invitations` (admin-only, unchanged by this
  pass) inserts the pending row. AvatarK Identity does not create
  invitations on behalf of a product.
- **AvatarK Identity validates identity and accepts invitations.**
  `lib/organizations/acceptInvitation.ts` (new) + the
  `/api/account/organizations/invitations/**` routes (new).
- **`organization_invitations`** (migration 016, extended by migration 021
  with an `accepted_by` column) stores invitation state.
- **`organization_members`** (migration 010, unchanged) stores accepted
  membership.
- **`account_preferences.current_organization_id`** (migration 018,
  unchanged) stores active context — the existing switch endpoint
  (`/api/account/organizations` `POST`) is untouched and still the only
  writer.
- **Capability grants remain separate.** Nothing in this pass reads or
  writes `capability_grants` (020) — see §5.

## 2. Data flow

```
Admin creates invitation ──▶ organization_invitations (pending, service-role only)
                                       │
                     GET /api/account/organizations/invitations
                     (own verified email only, never client-supplied)
                                       │
                                       ▼
                          Account → Organizations tab
                          (pending list, enter-code box)
                                       │
              accept ──────────────────────────────── decline
                │                                          │
                ▼                                          ▼
  POST .../invitations/accept                 POST .../invitations/decline
  1. token exists?                            1. token exists?
  2. not revoked / not expired                2. not already accepted
  3. email matches session email              3. email matches session email
  4. role recognized                          4. sets revoked_at
  5. INSERT organization_members (idempotent)
  6. UPDATE accepted_at/accepted_by (idempotent)
  7. audit event
                │
                ▼
      Organizations tab shows new membership
      Switch persists via existing current_organization_id route
      Leave available via POST /api/account/organizations/leave
      (blocked only for a sole owner while other members remain)
```

## 3. Route map

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/account/organizations` | GET/POST | List memberships, switch current org (pre-existing, unchanged) | Signed-in |
| `/api/account/organizations/invitations` | GET | List pending invitations for the caller's own email | Signed-in |
| `/api/account/organizations/invitations/accept` | POST | Accept by token | Signed-in |
| `/api/account/organizations/invitations/decline` | POST | Decline by token | Signed-in |
| `/api/account/organizations/leave` | POST | Leave an organization | Signed-in |
| `/api/admin/organizations/[id]/invitations` | POST | Admin creates an invitation (pre-existing, unchanged) | Platform admin |
| `/api/admin/organizations/[id]/invitations/[id]` | PATCH | Admin revokes an invitation (pre-existing, unchanged) | Platform admin |

## 4. Security rules

- **Identity is never client-supplied.** Every accept/decline/leave call
  derives `userId`/`userEmail` from the authenticated session
  (`supabase.auth.getUser()`), never from the request body. A request body
  can only ever carry *which* invitation/organization, never *whose*
  account acts — this is what makes "ordinary user cannot accept for
  another user" true by construction, not by an extra check.
- **Email match is mandatory** for email-bound invitations (all of them
  today — migration 016 has no "open" invite type) before acceptance or
  decline succeeds.
- **Idempotent repeat acceptance.** Re-submitting the same token as the
  same user returns success without re-inserting membership or
  re-auditing. Re-submitting as a *different* user than the original
  acceptor is refused.
- **Not a single atomic DB transaction.** Supabase's PostgREST layer
  exposes no multi-statement transaction to application code, and this
  repo has no precedent for a plpgsql RPC function (confirmed by grep —
  zero `.rpc(` calls anywhere before this pass). Safety instead comes from
  ordering + idempotent guards: `organization_members` is inserted
  (guarded by its own primary key) *before* `organization_invitations` is
  marked accepted (guarded by `accepted_at IS NULL`). A request interrupted
  between the two steps leaves the invitation safely re-acceptable rather
  than silently losing the membership. A future pass could strengthen this
  with a real `SECURITY DEFINER` Postgres function for single-statement
  atomicity — not done here, to keep this pass to application code only.
- **Audit events** are recorded for accept, decline, and leave
  (`organization_invitation.accept`, `organization_invitation.decline`,
  `organization.leave`) via the existing `recordAuditEvent()` helper.
- **Leave policy.** A member may always leave, except an organization's
  sole `owner` may not leave while other members remain (would strand the
  organization with members but no one in the one role that can manage
  it). An owner leaving an otherwise-empty organization is allowed. This
  is a new policy choice for this pass — the schema itself doesn't encode
  ownership succession, so this is an application-layer rule
  (`lib/organizations/leave.ts`), not a database constraint.

## 5. Capability separation

Accepting an invitation creates **membership and role assignment only**.
`lib/organizations/acceptInvitation.ts` never imports, reads, or writes
`capability_grants` — confirmed by a dedicated test
(`acceptOrganizationInvitation never touches capability_grants`) that fails
loudly if any future edit adds such a call. Capability grants remain a
separate admin workflow (`/api/admin/capabilities/**`, unchanged).

## 6. ArenaK compatibility

Organization invitations and ArenaK's content invitations
(`/enter/[token]`, `@avatark/invitations`) are **two distinct systems that
were already separate before this pass**, confirmed during audit:

- Different token formats: `organization_invitations.token` is a plain
  `uuid` (migration 016); ArenaK content tokens use a structured
  `type:id` scheme (`lib/invitations/tokenFormat.ts`).
- Different tables: `organization_invitations` vs. no table at all (ArenaK
  content invitations are resolved via `echoInvitationResolver`, not
  persisted here).
- Different acceptance surfaces: `/enter/[token]` vs. this pass's
  `/api/account/organizations/invitations/**`.

This pass **does not create a competing invitation token format** — it
extends the existing `organization_invitations` UUID-token design (already
established in migration 016, before this session) rather than inventing a
new one. `InvitationContext.organizationId` in `@avatark/invitations`
(the ArenaK-facing package) remains an unpopulated placeholder field, as it
was before this pass — organization invitations and content invitations
are not unified, by design, since they serve different products' concerns
(ArenaK content vs. platform membership).

## 7. Membership behavior

- Accepting inserts one `organization_members` row (`org_id`, `user_id`,
  `role` copied from the invitation).
- The Organizations tab's existing switch/current-organization logic
  (pre-existing, untouched) immediately reflects the new membership on
  next load.
- Access (`packages/account/src/ui/AccessTab.tsx`) is unaffected: it reads
  `product_access`/`capability_grants` only
  (`lib/products/accessModel.ts:95` — `organizationName: null // product_access
  has no organization_id column today`), never `organization_members`. No
  fabrication risk exists because there is no code path connecting the two.

## 8. Manual verification

- [ ] Create an invitation via `/admin/organizations/[id]` for a real test
      account's email.
- [ ] Sign in as that account; confirm the invitation appears under
      Organizations → Pending invitations with organization name, role,
      inviter email (when resolvable), and expiration.
- [ ] Accept; confirm membership appears immediately and Access is
      unchanged (no new capability rows).
- [ ] Attempt to accept the same token again; confirm no duplicate
      membership and no error.
- [ ] Create a second invitation, revoke it via admin, confirm the
      Organizations tab shows it can no longer be accepted.
- [ ] Create an invitation with a past `expires_at` (or wait past 14
      days); confirm it's rejected as expired.
- [ ] Sign in as an account whose email doesn't match a pending
      invitation's email; confirm the token is not listed and a direct
      accept attempt is rejected.
- [ ] As a sole owner of an organization with other members, attempt to
      leave; confirm it's blocked. Add a second owner; confirm leaving
      then succeeds.
- [ ] Switch active organization; reload the page; confirm the selection
      persists.

## 9. Remaining gaps

- **No "originating product" field.** Organization invitations carry no
  product association in this schema (`organization_invitations` has only
  `org_id` and `email` — no `product_id`). This is a genuine, structural
  difference from ArenaK's content invitations, which do carry a real
  return-path contract. The UI does not show a fabricated "originating
  product" field or a "return to product" action for organization
  invitations, since neither is backed by real data.
- **No true single-statement transaction** for accept (see §4) — a future
  RPC-based version would be a stronger guarantee.
- **No dedicated automated test for "active organization switch
  persists."** That endpoint (`POST /api/account/organizations`) predates
  this pass and is implemented directly against the Supabase server
  client inline, not as an extractable pure function; this repo has no
  route-handler test harness (confirmed — zero existing tests for any
  Next.js route handler), so adding one would have meant extracting and
  restructuring pre-existing, working code, which was out of scope here.
  It was previously verified manually/in production.
- **No in-product UI for an admin to see "who accepted."** `accepted_by`
  (migration 021) is stored but not yet surfaced in
  `app/admin/organizations/[id]/page.tsx` — a small follow-up.
