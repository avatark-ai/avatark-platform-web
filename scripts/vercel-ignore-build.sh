#!/bin/sh
# AVK-UNIFICATION-02 Ignored Build Step (adapted from AVK-FACE-REFRESH-02C).
# Reads only documented Vercel System Environment Variables; never prints values.
# Vercel semantics: exit 1 = proceed with the build, exit 0 = skip (CANCELED).
# Production: unchanged (always builds) -- this file only travels with commits that contain it.
# Preview: builds ONLY the approved integration branch; every other branch carrying this file is skipped.
# AVK-PROD-03A: this commit line previews ONLY the institutional release-candidate branch. The accepted
# U-03 baseline (e09f746, dpl_6SPuFMDv), FLW-02C (34361b1) and U-02D (cc54874) keep their own copies of
# this file and existing deployments are unaffected. Production still always builds and is gated by
# scripts/assert-preview-isolation.sh before install.
# AVK-ECOSYSTEM-04-PREVIEW: also admits exactly feature/avk-ecosystem-04 (owner-authorized protected Preview with its
# own 4 branch-scoped placeholder rows). The release branch's own copy of this file is unaffected.
APPROVED_BRANCH="release/avatark-institutional-01"
E04_BRANCH="feature/avk-ecosystem-04"
if [ "$VERCEL_ENV" = "production" ]; then echo 'AVK-U02 guard: production, building'; exit 1; fi
if [ "$VERCEL_ENV" = "preview" ] && { [ "$VERCEL_GIT_COMMIT_REF" = "$APPROVED_BRANCH" ] || [ "$VERCEL_GIT_COMMIT_REF" = "$E04_BRANCH" ]; }; then
  echo 'AVK-U02 guard: approved preview branch, building'; exit 1
fi
echo 'AVK-U02 guard: not an approved preview branch, build skipped'; exit 0
