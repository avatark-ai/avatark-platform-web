import Link from 'next/link'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { AdminUnavailable } from '../Unavailable'
import { CreateOrganizationForm } from './CreateOrganizationForm'

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const search = await searchParams
  const q = typeof search.q === 'string' ? search.q.trim() : ''

  if (!isAdminClientConfigured()) return <AdminUnavailable />

  const admin = createAdminClient()!
  let query = admin
    .from('organizations')
    .select('id, name, created_at, organization_members(count)')
    .order('created_at', { ascending: false })
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return <AdminUnavailable reason={error.message} />

  const orgs = (data ?? []) as { id: string; name: string; created_at: string; organization_members: { count: number }[] }[]

  return (
    <div className="space-y-6">
      <section className="rounded-md border p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Create organization</h2>
        <CreateOrganizationForm />
      </section>

      <section>
        <form className="mb-3 max-w-sm" method="get">
          <label htmlFor="org-search" className="mb-1 block text-xs font-medium text-neutral-600">
            Search by name
          </label>
          <input
            id="org-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search organizations…"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </form>

        {orgs.length === 0 ? (
          <p className="text-sm text-neutral-500">{q ? `No organizations match "${q}".` : 'No organizations exist yet.'}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Name</th>
                  <th scope="col" className="px-3 py-2">Members</th>
                  <th scope="col" className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/admin/organizations/${org.id}`} className="underline">
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{org.organization_members?.[0]?.count ?? 0}</td>
                    <td className="px-3 py-2 text-neutral-500">{org.created_at}</td>
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
