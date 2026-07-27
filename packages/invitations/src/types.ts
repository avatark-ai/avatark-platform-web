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
