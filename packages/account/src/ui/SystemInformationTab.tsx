'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { SystemInformationSnapshot, SystemServiceStatus } from '../contracts/adapters.ts'

// Canonical, reusable-across-products System Information section (mission
// Part 8). The server decides `visibilityTier` -- this component never
// infers admin visibility from anything client-side, it only ever renders
// what the adapter response already carries. Every admin-only field must
// already be null at the 'safe' tier (contract-level guarantee) before
// this ever runs; this component adds no additional gating of its own,
// since there would be nothing left to gate against a host that violated
// the contract.
const STATUS_LABEL: Record<SystemServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  unavailable: 'Unavailable',
  unknown: 'Unknown',
}

// Text + icon, never color alone (mission: "avoid traffic-light colors as
// the only signal").
const STATUS_ICON: Record<SystemServiceStatus, string> = {
  operational: '●',
  degraded: '◐',
  unavailable: '○',
  unknown: '?',
}

const STATUS_COLOR: Record<SystemServiceStatus, string> = {
  operational: 'text-emerald-400',
  degraded: 'text-amber-400',
  unavailable: 'text-red-400',
  unknown: 'text-[var(--text-dim,#8b8b98)]',
}

function StatusPill({ status }: { status: SystemServiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${STATUS_COLOR[status]}`}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="text-xs text-[var(--text-dim,#8b8b98)]">
      {label}: <span className="text-[var(--text-primary,#f5f2ea)]">{value ?? 'Unknown'}</span>
    </p>
  )
}

function CopyableField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <Field label={label} value={null} />
  return (
    <p className="text-xs text-[var(--text-dim,#8b8b98)] flex items-center gap-2">
      {label}: <span className="text-[var(--text-primary,#f5f2ea)]">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
        className="text-[var(--gold,#d4af5f)]"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </p>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="aka-card p-4 space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-1">{title}</p>
      {children}
    </div>
  )
}

export function SystemInformationTab() {
  const adapters = useAccountAdapters()
  const [snapshot, setSnapshot] = useState<SystemInformationSnapshot | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!adapters.systemInformation) { setSnapshot(null); return }
    adapters.systemInformation.get().then((res) => {
      if (res.error) { setError(res.error); return }
      setError(null)
      setSnapshot(res.data ?? null)
    })
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) load()
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters])

  if (snapshot === undefined) return <div className="h-40 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  if (error) {
    return (
      <div className="aka-card p-4" role="alert">
        <p className="text-sm text-red-400">Couldn&apos;t load system information: {error}</p>
        <button onClick={load} className="mt-2 text-sm text-[var(--gold,#d4af5f)]">Try again</button>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="aka-card p-4">
        <p className="text-sm text-[var(--text-dim,#8b8b98)]">System information isn&apos;t available for this product.</p>
      </div>
    )
  }

  const isAdmin = snapshot.visibilityTier === 'admin'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card title="Application">
          <Field label="Product" value={snapshot.productName} />
          <Field label="Environment" value={snapshot.environment} />
          <Field label="Version" value={snapshot.appVersion} />
          <Field label="Build date" value={snapshot.buildDate ? new Date(snapshot.buildDate).toLocaleDateString() : null} />
          <Field label="Deployment" value={snapshot.deploymentIdShort} />
        </Card>

        <Card title="Identity">
          <Field label="Sign-in method(s)" value={snapshot.authProviders.length > 0 ? snapshot.authProviders.join(', ') : null} />
          <Field label="Account package" value={snapshot.accountPackageVersion} />
          <Field label="Auth UI package" value={snapshot.authUiPackageVersion} />
          {isAdmin && <StatusRow label="Identity adapter" status={snapshot.services?.identity} />}
        </Card>

        <Card title="Organization Context">
          <Field label="Current organization" value={snapshot.currentOrganizationName ?? 'Personal'} />
          {/* Null here means "Personal context, no organization" -- a correct
              absence, not an unknown value, so it's only shown when there
              actually is an id (never rendered as "Unknown"). */}
          {isAdmin && snapshot.currentOrganizationId && <Field label="Organization id" value={snapshot.currentOrganizationId} />}
          {isAdmin && <StatusRow label="Organization subsystem" status={snapshot.services?.organizations} />}
        </Card>

        <Card title="Platform Services">
          <StatusRow label="Storage" status={snapshot.storageAvailability} />
          <StatusRow label="Capabilities" status={snapshot.capabilityServiceAvailability} />
          <StatusRow label="Invitations" status={snapshot.invitationServiceAvailability} />
          {isAdmin && <StatusRow label="Account adapter" status={snapshot.services?.account} />}
          {isAdmin && <StatusRow label="Audit subsystem" status={snapshot.services?.audit} />}
          <p className="text-xs text-[var(--text-dim,#8b8b98)] pt-1">{snapshot.platformStatusSummary}</p>
        </Card>

        <Card title="Deployment">
          <Field label="Product registry" value={snapshot.registryVersion} />
          {isAdmin && (
            <>
              <Field label="Vercel environment" value={snapshot.vercelEnvironment} />
              <CopyableField label="Commit" value={snapshot.commitShaShort} />
              <Field label="Build timestamp" value={snapshot.buildTimestamp} />
              <Field label="Supabase project" value={snapshot.supabaseProjectLabel} />
              <Field label="Migration level" value={snapshot.migrationLevel != null ? String(snapshot.migrationLevel) : null} />
              <Field label="Callback origin" value={snapshot.callbackOrigin} />
              <Field label="Site origin" value={snapshot.currentSiteOrigin} />
              <Field label="Registry revision" value={snapshot.registryRevision} />
              <Field label="Last checked" value={snapshot.lastHealthCheckAt ? new Date(snapshot.lastHealthCheckAt).toLocaleString() : null} />
              {snapshot.packageVersions && (
                <details className="text-xs text-[var(--text-dim,#8b8b98)]">
                  <summary className="cursor-pointer text-[var(--gold,#d4af5f)]">Package versions</summary>
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(snapshot.packageVersions).map(([name, version]) => (
                      <li key={name}>{name}@{version}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <a href={snapshot.statusUrl} className="text-[var(--gold,#d4af5f)]">Platform Status</a>
        <a href={snapshot.supportUrl} className="text-[var(--gold,#d4af5f)]">Support</a>
        {isAdmin && snapshot.adminUrl && <a href={snapshot.adminUrl} className="text-[var(--gold,#d4af5f)]">Admin diagnostics</a>}
      </div>
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status: SystemServiceStatus | undefined }) {
  return (
    <p className="text-xs text-[var(--text-dim,#8b8b98)] flex items-center justify-between">
      <span>{label}</span>
      <StatusPill status={status ?? 'unknown'} />
    </p>
  )
}
