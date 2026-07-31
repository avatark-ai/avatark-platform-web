// Target vocabulary only -- no `type`/`kind` column exists on the real
// `organizations` table today (supabase/migrations/010_organizations.sql),
// and no code anywhere branches on one. Declared here per
// docs/PLATFORM_CONTRACTS.md's Organization Context section ("document
// contract only, do not implement backend") so the target shape is a real,
// checkable artifact rather than only prose.
export type OrganizationType =
  | "personal"
  | "enterprise"
  | "institution"
  | "conference"
  | "university"
  | "family"
