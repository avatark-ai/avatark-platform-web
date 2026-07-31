import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { getUserEmailMap } from '@/lib/admin/userDirectory'
import { classifyInvitationStatus, ORG_ROLE_CAPABILITY_REFERENCE } from '@avatark/organizations'
import { AdminUnavailable } from '../../Unavailable'
import { InviteMemberForm, RevokeInvitationButton, ChangeMemberRoleSelect } from './OrganizationActions'

interface MemberRow {
  user_id: string
  role: string
  created_at: string
}
interface InvitationRow {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}
interface AuditRow {
  id: string
  actor_id: string | null
  action: string
  metadata: Record<string, unknown>
  result: string
  created_at: string
}

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id: orgId } = await params
  const search = await searchParams
  const roleFilter = typeof search.role === 'string' ? search.role : ''

  if (!isAdminClientConfigured()) return <AdminUnavailable />
  const admin = createAdminClient()!

  const { data: org, error: orgError } = await admin.from('organizations').select('id, name, created_at').eq('id', orgId).maybeSingle()
  if (orgError) return <AdminUnavailable reason={orgError.message} />
  if (!org) notFound()

  let membersQuery = admin
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  if (roleFilter) membersQuery = membersQuery.eq('role', roleFilter)

  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }, { data: auditEvents }, emails] =
    await Promise.all([
      membersQuery,
      admin
        .from('organization_invitations')
        .select('id, email, role, created_at, expires_at, accepted_at, revoked_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('platform_audit_events')
        .select('id, actor_id, action, metadata, result, created_at')
        .eq('target_type', 'organization')
        .eq('target_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50),
      getUserEmailMap(admin),
    ])

  if (membersError || invitationsError) {
    return <AdminUnavailable reason={membersError?.message ?? invitationsError?.message} />
  }

  const now = new Date()
  const memberRows = (members ?? []) as MemberRow[]
  const invitationRows = (invitations ?? []) as InvitationRow[]
  const auditRows = (auditEvents ?? []) as AuditRow[]

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/organizations" className="text-sm underline">
          ← All organizations
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{org.name}</h2>
        <p className="text-xs text-neutral-500">Created {org.created_at}</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Members</h3>
        <form className="mb-3 max-w-xs" method="get">
          <label htmlFor="role-filter" className="mb-1 block text-xs font-medium text-neutral-600">
            Filter by role
          </label>
          <select id="role-filter" name="role" defaultValue={roleFilter} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">All roles</option>
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </form>
        {memberRows.length === 0 ? (
          <p className="text-sm text-neutral-500">{roleFilter ? `No members with role "${roleFilter}".` : 'No members yet.'}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2">User</th>
                  <th scope="col" className="px-3 py-2">Role</th>
                  <th scope="col" className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((m) => (
                  <tr key={m.user_id} className="border-t">
                    <td className="px-3 py-2">{emails.get(m.user_id) ?? m.user_id}</td>
                    <td className="px-3 py-2">
                      <ChangeMemberRoleSelect orgId={orgId} userId={m.user_id} currentRole={m.role} />
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{m.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Invitations</h3>
        <div className="mb-3 rounded-md border p-4">
          <InviteMemberForm orgId={orgId} />
          <p className="mt-2 text-xs text-neutral-500">
            No self-serve accept flow exists yet — this records the invitation and its status only. An admin must add the member
            manually once they accept.
          </p>
        </div>
        {invitationRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No invitations sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Email</th>
                  <th scope="col" className="px-3 py-2">Role</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Sent</th>
                  <th scope="col" className="px-3 py-2">Expires</th>
                  <th scope="col" className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitationRows.map((inv) => {
                  const status = classifyInvitationStatus(inv, now)
                  return (
                    <tr key={inv.id} className="border-t">
                      <td className="px-3 py-2">{inv.email}</td>
                      <td className="px-3 py-2">{inv.role}</td>
                      <td className="px-3 py-2 capitalize">{status}</td>
                      <td className="px-3 py-2 text-neutral-500">{inv.created_at}</td>
                      <td className="px-3 py-2 text-neutral-500">{inv.expires_at}</td>
                      <td className="px-3 py-2">
                        {status === 'pending' && <RevokeInvitationButton orgId={orgId} invitationId={inv.id} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Permissions (design reference)</h3>
        <p className="mb-2 text-xs text-neutral-500">
          Describes the intended capability model for each role. Not yet enforced by any authorization check in this repo — no
          code branches on organization role beyond display today.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2">Role</th>
                <th scope="col" className="px-3 py-2">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {ORG_ROLE_CAPABILITY_REFERENCE.map((r) => (
                <tr key={r.role} className="border-t">
                  <td className="px-3 py-2 font-medium">{r.role}</td>
                  <td className="px-3 py-2 text-neutral-600">{r.capabilities.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Audit (this organization)</h3>
        {auditRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No audit events recorded for this organization yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Time</th>
                  <th scope="col" className="px-3 py-2">Actor</th>
                  <th scope="col" className="px-3 py-2">Action</th>
                  <th scope="col" className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2 text-neutral-500">{e.created_at}</td>
                    <td className="px-3 py-2">{e.actor_id ? emails.get(e.actor_id) ?? e.actor_id : '—'}</td>
                    <td className="px-3 py-2">{e.action}</td>
                    <td className="px-3 py-2 capitalize">{e.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
