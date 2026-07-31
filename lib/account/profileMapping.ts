// Pure mapping between the wire shape @avatark/account's ProfileTab sends/
// expects and the canonical public.profiles row (supabase/migrations/002,
// 017). Kept separate from app/api/account/profile/route.ts so the
// previously-silent role/organization/location drop (route.ts hardcoded
// them to null because the columns didn't exist yet) has a unit-testable
// seam -- this repo's Supabase-backed routes otherwise have no test
// coverage at all, per docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md.
export interface ProfileRow {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string | null
  organization: string | null
  location: string | null
  created_at: string
}

export interface ProfileResponse {
  id: string
  email: string
  displayName: string | null
  bio: string | null
  role: string | null
  avatarUrl: string | null
  organization: string | null
  location: string | null
  createdAt: string
}

export function toProfileResponse(row: ProfileRow, email: string): ProfileResponse {
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    bio: row.bio,
    role: row.role,
    avatarUrl: row.avatar_url,
    organization: row.organization,
    location: row.location,
    createdAt: row.created_at,
  }
}

export function toProfileUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.bio !== undefined) updates.bio = body.bio
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl
  if (body.role !== undefined) updates.role = body.role
  if (body.organization !== undefined) updates.organization = body.organization
  if (body.location !== undefined) updates.location = body.location
  return updates
}
