// Real missing-boundary fix: before this, "organizations" had no adapter
// contract at all -- every Server Component/route under app/admin/organizations/**
// called supabase.from('organizations')/... directly, inline, with no
// shared interface a second implementation (e.g. an in-memory one for
// tests, or ArenaK's own organizations concept, if it ever needs one)
// could conform to. This defines that contract, using the shared
// AdapterResult vocabulary (lib/adapters/status.ts) instead of inventing
// a 5th ad-hoc shape.
//
// Lives at the app layer, not inside @avatark/organizations, because the
// workspace packages under packages/* must stay free of app-local (`@/`)
// imports -- confirmed as a real constraint during the Part 1 package
// audit (docs/PLATFORM_PACKAGE_DISTRIBUTION.md). @avatark/organizations
// keeps the portable domain types (Organization, OrganizationMember);
// this file is the concrete contract that wraps them.
import type { Organization, OrganizationMember } from "@avatark/organizations"
import type { AdapterResult } from "../adapters/status.ts"

export interface OrganizationsAdapter {
  // Required: every implementation must support reading a user's own
  // organization memberships -- the one operation every current caller
  // (admin pages, a future member-facing surface) actually needs.
  listForUser(userId: string): Promise<AdapterResult<Organization[]>>
  get(orgId: string): Promise<AdapterResult<Organization>>
  listMembers(orgId: string): Promise<AdapterResult<OrganizationMember[]>>

  // Optional: mutation. Real implementations today (app/api/admin/organizations/**)
  // route these through the service-role client server-side, never through
  // RLS-governed `authenticated` access (migrations 014/015 grant
  // `authenticated` SELECT only) -- see the privacy boundary note below.
  // An adapter may omit these (undefined) rather than throw, if the
  // product/environment genuinely has no mutation path -- e.g. a
  // read-only reporting consumer.
  create?(name: string): Promise<AdapterResult<Organization>>
  addMember?(orgId: string, userId: string, role: string): Promise<AdapterResult<OrganizationMember>>
  removeMember?(orgId: string, userId: string): Promise<AdapterResult<void>>
}

// Privacy boundary: listForUser/get/listMembers must never return a row
// for an organization the caller (userId) is not a member of -- the same
// boundary migration 014's RLS policies enforce at the database layer
// (organizations_select_member, organization_members_select_own). An
// in-memory adapter used in tests must enforce this in application code,
// since it has no RLS layer to fall back on -- see
// lib/organizations/inMemoryAdapter.ts.
//
// Server/client boundary: every real implementation of this contract runs
// server-side only (Server Components / route handlers), matching
// app/admin/organizations/**'s current architecture -- there is no
// client-side implementation of OrganizationsAdapter anywhere, and this
// contract does not require one.
