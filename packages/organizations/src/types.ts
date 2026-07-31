// Target vocabulary only -- no `type`/`kind` column exists on the real
// `organizations` table today (supabase/migrations/010_organizations.sql),
// and no code anywhere branches on one. Declared here per
// docs/PLATFORM_CONTRACTS.md's Organization Context section ("document
// contract only, do not implement backend") so the target shape is a real,
// checkable artifact rather than only prose. Phase 2 supersedes Phase 1's
// smaller 6-value draft with the fuller target list below -- zero real
// consumers exist for either, so widening this is non-breaking.
export type OrganizationType =
  | "personal"
  | "family"
  | "team"
  | "company"
  | "university"
  | "school"
  | "community"
  | "conference"
  | "event"
  | "workshop"
  | "institution"
  | "temple"

// Target capability contracts -- a more structured, typed companion to
// the existing string-list ORG_ROLE_CAPABILITY_REFERENCE (permissions.ts),
// not a replacement for it. Neither this nor that reference table is
// enforced anywhere; no code branches on organization_members.role beyond
// display today (see permissions.ts's own header comment).
export interface InvitationAuthority {
  canInvite: boolean
  canRevoke: boolean
}

export interface PublishingAuthority {
  canPublish: boolean
  canUnpublish: boolean
}

export interface RecognitionAuthority {
  canRecognize: boolean
}

export interface ChallengeAuthority {
  canCreateChallenge: boolean
  canCloseChallenge: boolean
}

export interface MembershipAuthority {
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canAssignRoles: boolean
}

// Real row shapes, matching the actual live schema
// (supabase/migrations/010_organizations.sql) -- unlike OrganizationType
// and the *Authority interfaces above (target-only, unenforced vocabulary),
// these mirror columns that exist and are read/written today by
// app/admin/organizations/**. No `type` field: the real `organizations`
// table has none (see OrganizationType's own comment).
export interface Organization {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  orgId: string
  userId: string
  role: string
  createdAt: string
}
