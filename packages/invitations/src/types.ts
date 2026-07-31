// Shared, framework-agnostic invitation contract -- the same role for
// invitations that @avatark/product-registry plays for products: one
// typed shape every AvatarK app can consume instead of each product
// inventing its own invitation model.
//
// Ownership (see the ecosystem architecture decision this package
// implements): ArenaK is the PRODUCER of invitations -- it owns
// creation, lifecycle, tokens, QR codes, permissions, analytics,
// expiration and usage limits. Every other product (Echo, StreamK,
// GameK, CinemaK, future ones) is a CONSUMER: it resolves a token
// through an InvitationResolver, previews the destination, and accepts
// or declines. This package defines the contract both sides share; it
// is deliberately silent on HOW a token is produced or persisted --
// that's ArenaK's concern, not this package's.
//
// No dependency on any specific product, framework, or storage layer.
// A product id is a plain string (matching @avatark/product-registry's
// own `AvatarKProduct.id: string`) rather than an imported enum, so
// this package never needs that one as a dependency either.

export type InvitationType =
  | "echo"
  | "practice"
  | "echo_practice"
  | "cohort"
  | "event"
  | "story"
  | "episode";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "exhausted"
  | "revoked"
  | "invalid";

/**
 * Where an accepted invitation actually leads. A discriminated union on
 * `type` so a consumer can resolve the right destination without ever
 * needing to guess a field's meaning from a display title -- the exact
 * failure mode this contract exists to prevent (see
 * InvitationValidation below).
 */
export type InvitationDestination =
  | { type: "echo"; echoSlug: string }
  | { type: "practice"; practiceSlug: string }
  | { type: "echo_practice"; echoSlug: string; practiceSlug: string }
  | { type: "cohort"; cohortId: string; practiceSlug?: string }
  | { type: "event"; eventId: string }
  | { type: "story"; storySlug: string }
  | { type: "episode"; episodeSlug: string };

export interface InvitationMetadata {
  /** The product id that issued this invitation (e.g. "arenak"). Never assumed -- always carried through from the resolver. */
  issuedBy: string;
  createdAt: string;
  expiresAt: string | null;
  /** null: unlimited uses. */
  maxUses: number | null;
  useCount: number;
  cohortId?: string;
  eventId?: string;
}

export type InvitationToken = string;

export interface Invitation {
  token: InvitationToken;
  type: InvitationType;
  destination: InvitationDestination;
  status: InvitationStatus;
  metadata: InvitationMetadata;
}

/** The record of a consumer product accepting an invitation on a user's behalf. */
export interface InvitationAcceptance {
  token: InvitationToken;
  acceptedAt: string;
  /** The product the acceptance happened in (e.g. "echo"). */
  acceptedIn: string;
  /** Opaque user identifier in whatever form the accepting product already has -- never re-derived here. */
  acceptedBy: string | null;
}

/**
 * The one boundary a consumer product implements against. A real
 * ArenaK-backed resolver (HTTP call, or a shared data layer once one
 * exists) and a local/offline reference resolver both satisfy this same
 * interface -- callers never need to know which one they're using.
 */
export interface InvitationResolver {
  resolve(token: InvitationToken): Promise<Invitation | null>;
}

// ============================================================
// Phase 1 -- Cross-product invitation context (contracts only).
//
// The mission this phase implements is explicit: "Do NOT implement
// invitation flows yet" -- everything below is vocabulary, not a
// resolver, a store, or a flow. It names the entities a *future*
// implementation phase will need (Entry Door, Target/Return Product,
// Campaign), and cross-references Membership/Organization/Practice/
// Episode/Journey -- all real concepts that already live in their own
// packages (@avatark/membership, @avatark/organizations,
// @avatark/journey) or, for Practice/Episode, as existing
// `InvitationType` values above. This package never imports any of
// those three packages: @avatark/journey already depends on
// @avatark/invitations (packages/journey/src/manifest.ts,
// recovery.ts), so the reverse dependency would be a cycle; and the
// package's own header comment already establishes the convention this
// follows -- a foreign id is always a plain string, never an imported
// type, so this package never needs that dependency at all. See
// docs/INVITATION_CONTRACTS.md for the full rationale per entity.

/**
 * *How* a visitor first arrived at an invitation, as distinct from
 * `InvitationType` (*where* it leads). A QR code scanned at an event and
 * a link pasted from an email can both resolve to the same
 * `InvitationType: "practice"` destination -- Entry Door is what tells
 * two otherwise-identical invitations apart for attribution purposes.
 */
export type EntryDoor = "direct_link" | "qr_code" | "email" | "sms" | "social_share" | "referral";

/**
 * The product an invitation ultimately leads to. A plain product id
 * string, matching @avatark/product-registry's own `AvatarKProduct.id:
 * string` -- see this file's header comment on why no enum is imported.
 */
export type TargetProduct = string;

/**
 * The product a visitor is expected to return to once the invitation's
 * destination experience concludes -- e.g. "avatark" after a PrometheusK
 * practice, the same real pattern lib/journey/continuity.ts's
 * `getContinuityAction()` already implements app-locally in this repo.
 * Null when no return is expected (the invitation is terminal).
 */
export type ReturnProduct = string | null;

/**
 * A named batch an invitation was issued as part of -- e.g. a launch
 * cohort or a seasonal push. Owned by whichever product issues the
 * invitation (almost always ArenaK, this package's own producer -- see
 * this file's header comment), never assumed to be AvatarK's.
 */
export interface InvitationCampaign {
  id: string;
  name: string;
  /** Product id that owns this campaign. */
  ownedBy: string;
  startsAt: string | null;
  endsAt: string | null;
}

/**
 * The canonical shape an invitation's full cross-product context takes
 * once Entry Door / Campaign / Target Product / Return Product are all
 * known. Contract only -- no resolver anywhere produces this shape yet
 * (see this section's header comment). Membership/Organization/Journey
 * are referenced only as opaque ids, never as imported types, so this
 * package's dependency graph stays exactly as it is today.
 */
export interface InvitationContext {
  invitation: Invitation;
  entryDoor: EntryDoor | null;
  campaign: InvitationCampaign | null;
  targetProduct: TargetProduct;
  returnProduct: ReturnProduct;
  /** Opaque id into @avatark/membership's plan vocabulary, if the invitation carries a membership implication (e.g. a paid-tier cohort invite). Null: no membership system reads this today (see @avatark/membership's own header comment -- `free` is the only real plan anywhere). */
  membershipPlan: string | null;
  /** Opaque id into @avatark/organizations' `Organization.id`, if this invitation is scoped to an organization. Null otherwise. */
  organizationId: string | null;
  /** Opaque id into @avatark/journey's `JourneyManifest.journeyId`, if a journey has already started for this visitor. Null for a fresh, unstarted invitation. */
  journeyId: string | null;
}

/**
 * Builds an `InvitationContext` with every optional field explicitly
 * defaulted to its "not yet known" value -- so a caller only ever
 * overrides what it actually knows, the same "one object, override what's
 * true" convention @avatark/product-registry's `PRODUCT_REGISTRY` uses.
 */
export function createInvitationContext(
  invitation: Invitation,
  targetProduct: TargetProduct,
  overrides: Partial<Omit<InvitationContext, "invitation" | "targetProduct">> = {}
): InvitationContext {
  return {
    invitation,
    targetProduct,
    entryDoor: overrides.entryDoor ?? null,
    campaign: overrides.campaign ?? null,
    returnProduct: overrides.returnProduct ?? null,
    membershipPlan: overrides.membershipPlan ?? null,
    organizationId: overrides.organizationId ?? null,
    journeyId: overrides.journeyId ?? null,
  };
}
