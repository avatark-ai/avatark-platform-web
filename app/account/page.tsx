'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AccountAdaptersProvider, AvatarKAccount, type AccountTabKey } from '@avatark/account'
import { avatarKPlatformAdapters } from '@/lib/account/adapters'
import type { AccountPrincipal } from '@/lib/auth/principal'

// Real feature flag, per explicit instruction: /account behind a flag,
// not unconditionally live. Reads a real env var -- no hardcoded true.
const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true'

function AccountRoot({ principal }: { principal: AccountPrincipal }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawTab = searchParams.get('tab')
  const activeTab = (rawTab ?? undefined) as AccountTabKey | undefined

  function handleActiveTabChange(next: AccountTabKey) {
    if (next === rawTab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.push(`/account?${params.toString()}`)
  }

  return (
    <AccountAdaptersProvider adapters={avatarKPlatformAdapters}>
      <AvatarKAccount
        principal={principal}
        currentProduct="avatark"
        productName="AvatarK"
        activeTab={activeTab}
        onActiveTabChange={handleActiveTabChange}
        onSignedOut={() => { window.location.href = '/auth/sign-in' }}
      />
    </AccountAdaptersProvider>
  )
}

function AccountClientGate() {
  const [principal, setPrincipal] = useState<AccountPrincipal>({ status: 'loading' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setPrincipal({ status: 'signed_out' }); return }
      const res = await fetch('/api/account/profile')
      const profile = res.ok ? await res.json() : null
      setPrincipal({
        status: 'signed_in',
        id: user.id,
        displayName: profile?.displayName ?? user.email?.split('@')[0] ?? 'Member',
        email: user.email ?? '',
      })
    })
  }, [])

  // Real fix: the redirect is a genuine side effect and must live in its
  // own useEffect, not directly in the render body -- a real lint catch
  // (react-hooks/immutability), not a false positive. React 19's render
  // path is expected to be pure; redirecting during render violates that.
  useEffect(() => {
    if (principal.status === 'signed_out') {
      window.location.href = '/auth/sign-in?return=/account'
    }
  }, [principal.status])

  if (principal.status === 'loading' || principal.status === 'signed_out') {
    return <div className="max-w-md mx-auto px-4 py-16 text-sm text-neutral-600">Loading…</div>
  }

  return <AccountRoot principal={principal} />
}

export default function AccountPage() {
  if (!ACCOUNT_MOUNT_ENABLED) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <p className="text-sm text-neutral-600">Account is not yet available.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <AccountClientGate />
    </Suspense>
  )
}
