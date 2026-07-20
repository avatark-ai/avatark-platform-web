import { computeEnvironmentHealth } from '@/lib/admin/environment'

export default function AdminEnvironmentHealthPage() {
  const rows = computeEnvironmentHealth(process.env)

  return (
    <div className="max-w-2xl overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr><th className="px-3 py-2">Environment</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Detail</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t">
              <td className="px-3 py-2 font-medium capitalize">{r.name}</td>
              <td className="px-3 py-2 capitalize">{r.state}</td>
              <td className="px-3 py-2 text-neutral-500">{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
