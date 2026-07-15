import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnPath = safeReturnPath(searchParams.get('return'), '/account')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${returnPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=callback_failed`)
}
