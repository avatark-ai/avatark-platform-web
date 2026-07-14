import { resolvePrincipal } from '@/lib/auth/principal'
import { signOut } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'

// Real, minimal protected-route proof for Checkpoint 3 -- NOT the real
// @avatark/account mount (that's Checkpoint 4, per the explicit stop
// condition). This exists only to prove principal resolution + session
// + protected-route redirect + sign-out all genuinely work end to end.
export default async function AccountPlaceholderPage() {
  const principal = await resolvePrincipal()

  if (principal.status === 'signed_out') {
    redirect('/auth/sign-in?return=/account')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-4">
      <h1 className="text-xl font-semibold">Signed in</h1>
      <p className="text-sm text-neutral-600">{principal.status === 'signed_in' ? principal.email : ''}</p>
      <form action={signOut}>
        <button className="rounded-md border px-4 py-2 text-sm">Sign out</button>
      </form>
    </div>
  )
}
