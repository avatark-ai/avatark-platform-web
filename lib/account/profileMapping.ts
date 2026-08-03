// Pure mapping between the wire shape @avatark/account's ProfileTab sends/
// expects and the canonical public.profiles row (supabase/migrations/002,
// 017, 022). Kept separate from app/api/account/profile/route.ts so the
// previously-silent role/organization/location drop (route.ts hardcoded
// them to null because the columns didn't exist yet) has a unit-testable
// seam -- this repo's Supabase-backed routes otherwise have no test
// coverage at all, per docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md.
//
// `location` was a single free-text column (017); migration 022 replaces it
// with six normalized columns (Platform RC, Phase 4). The old `location`
// column is left in the table, unused by this mapping going forward -- no
// existing row is read from or written to it here anymore, but nothing
// drops it either.
export interface AccountLocationFields {
  countryCode: string | null
  countryName: string | null
  stateCode: string | null
  stateName: string | null
  city: string | null
  timezone: string | null
}

export interface ProfileRow {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string | null
  organization: string | null
  location_country_code: string | null
  location_country_name: string | null
  location_state_code: string | null
  location_state_name: string | null
  location_city: string | null
  location_timezone: string | null
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
  location: AccountLocationFields | null
  createdAt: string
}

export function toProfileResponse(row: ProfileRow, email: string): ProfileResponse {
  const hasLocation = row.location_country_code || row.location_country_name || row.location_state_code
    || row.location_state_name || row.location_city || row.location_timezone
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    bio: row.bio,
    role: row.role,
    avatarUrl: row.avatar_url,
    organization: row.organization,
    location: hasLocation
      ? {
          countryCode: row.location_country_code, countryName: row.location_country_name,
          stateCode: row.location_state_code, stateName: row.location_state_name,
          city: row.location_city, timezone: row.location_timezone,
        }
      : null,
    createdAt: row.created_at,
  }
}

function isLocationFields(value: unknown): value is Partial<AccountLocationFields> {
  return typeof value === 'object' && value !== null
}

export function toProfileUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.bio !== undefined) updates.bio = body.bio
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl
  if (body.role !== undefined) updates.role = body.role
  if (body.organization !== undefined) updates.organization = body.organization
  if (body.location !== undefined) {
    const loc = body.location === null ? null : isLocationFields(body.location) ? body.location : null
    updates.location_country_code = loc?.countryCode ?? null
    updates.location_country_name = loc?.countryName ?? null
    updates.location_state_code = loc?.stateCode ?? null
    updates.location_state_name = loc?.stateName ?? null
    updates.location_city = loc?.city ?? null
    updates.location_timezone = loc?.timezone ?? null
  }
  return updates
}
