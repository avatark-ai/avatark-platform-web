#!/bin/sh
# AVK-UNIFICATION-02 pre-install isolation assertion (first command of installCommand), extended by
# AVK-PROD-03A (C5) for the institutional-only release scope.
# Preview: must be the approved release-candidate branch with the exact non-functional Preview
# placeholders. Production: must be the Production branch with the exact non-functional Production
# placeholders (AVK-PROD-02R V-1). In both, server secrets must be UNSET and Sign In, account mount and
# Google OAuth off. Anything else -- including any other VERCEL_ENV -- exits 1 before any dependency
# is installed, so this build can never install against real Supabase values.
# Prints only per-condition ok / mismatch / unset / set. Never prints values.
B=release/avatark-institutional-01; PB=platform/foundation-20260714; F=0
case "$VERCEL_ENV" in
  preview) T=AVK-U02; R=$B; P=https://preview-placeholder.invalid; K=preview-placeholder-not-a-key ;;
  production) T=AVK-PROD; R=$PB; P=https://production-placeholder.invalid; K=production-placeholder-not-a-key ;;
  *) echo 'AVK-PROD assert: VERCEL_ENV not preview/production, failing before install'; exit 1 ;;
esac
# eq NAME VALUE ISSET EXPECTED
eq() { if [ -z "$3" ]; then s=unset; F=1; elif [ "$2" = "$4" ]; then s=ok; else s=mismatch; F=1; fi; echo "$T assert: $1=$s"; }
# absent NAME ISSET  (must be unset)
absent() { if [ -z "$2" ]; then s=ok; else s=set; F=1; fi; echo "$T assert: $1(unset)=$s"; }
# off NAME VALUE ISSET  (unset or exactly 'false')
off() { if [ -z "$3" ] || [ "$2" = "false" ]; then s=ok; else s=mismatch; F=1; fi; echo "$T assert: $1(off)=$s"; }
eq VERCEL_GIT_COMMIT_REF "$VERCEL_GIT_COMMIT_REF" "${VERCEL_GIT_COMMIT_REF+x}" "$R"
eq NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL" "${NEXT_PUBLIC_SUPABASE_URL+x}" "$P"
eq NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "${NEXT_PUBLIC_SUPABASE_ANON_KEY+x}" "$K"
eq NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY+x}" "$K"
eq NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED "$NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED" "${NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED+x}" false
absent SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY+x}"
absent ONBOARDING_RECEIPT_SECRET "${ONBOARDING_RECEIPT_SECRET+x}"
off NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED "$NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED" "${NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED+x}"
off NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED "$NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED" "${NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED+x}"
if [ $F = 0 ]; then echo "$T assert: $VERCEL_ENV isolated, installing"; exit 0; fi
echo "$T assert: $VERCEL_ENV NOT isolated, failing before install"; exit 1
