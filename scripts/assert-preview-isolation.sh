#!/bin/sh
# AVK-UNIFICATION-02 pre-install isolation assertion (first command of installCommand).
# Production: no-op. Anything else must be the approved Preview branch with the exact
# non-functional placeholders below, with server secrets UNSET, else exit 1 before any
# dependency is installed -- so a Preview can never build against Production Supabase
# (the project's '*'-scope rows hold Production values).
# Prints only per-condition ok / mismatch / unset / set. Never prints values.
if [ "$VERCEL_ENV" = "production" ]; then echo 'AVK-U02 assert: production, no-op'; exit 0; fi
P=https://preview-placeholder.invalid; K=preview-placeholder-not-a-key; B=integration/avk-unification-03; F=0
# eq NAME VALUE ISSET EXPECTED
eq() { if [ -z "$3" ]; then s=unset; F=1; elif [ "$2" = "$4" ]; then s=ok; else s=mismatch; F=1; fi; echo "AVK-U02 assert: $1=$s"; }
# absent NAME ISSET  (must be unset)
absent() { if [ -z "$2" ]; then s=ok; else s=set; F=1; fi; echo "AVK-U02 assert: $1(unset)=$s"; }
eq VERCEL_ENV "$VERCEL_ENV" "${VERCEL_ENV+x}" preview
eq VERCEL_GIT_COMMIT_REF "$VERCEL_GIT_COMMIT_REF" "${VERCEL_GIT_COMMIT_REF+x}" "$B"
eq NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL" "${NEXT_PUBLIC_SUPABASE_URL+x}" "$P"
eq NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "${NEXT_PUBLIC_SUPABASE_ANON_KEY+x}" "$K"
eq NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY+x}" "$K"
eq NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED "$NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED" "${NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED+x}" false
absent SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY+x}"
absent ONBOARDING_RECEIPT_SECRET "${ONBOARDING_RECEIPT_SECRET+x}"
if [ -z "${NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED+x}" ] || [ "$NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED" = "false" ]; then s=ok; else s=mismatch; F=1; fi
echo "AVK-U02 assert: NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED(off)=$s"
if [ $F = 0 ]; then echo 'AVK-U02 assert: preview isolated, installing'; exit 0; fi
echo 'AVK-U02 assert: preview NOT isolated, failing before install'; exit 1
