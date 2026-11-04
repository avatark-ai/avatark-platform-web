#!/bin/sh
# AVK-UNIFICATION-02 Ignored Build Step (adapted from AVK-FACE-REFRESH-02C).
# Reads only documented Vercel System Environment Variables; never prints values.
# Vercel semantics: exit 1 = proceed with the build, exit 0 = skip (CANCELED).
# Production: unchanged (always builds) -- this file only travels with commits that contain it.
# Preview: builds ONLY the approved integration branch; every other branch carrying this file is skipped.
# AVK-FLW-02A: this commit line previews ONLY the Founder/Living Worlds editorial branch. The certified
# U-02D branch keeps its own copy of this file at cc54874 and is not affected.
APPROVED_BRANCH="integration/avk-founder-living-worlds-02"
if [ "$VERCEL_ENV" = "production" ]; then echo 'AVK-U02 guard: production, building'; exit 1; fi
if [ "$VERCEL_ENV" = "preview" ] && [ "$VERCEL_GIT_COMMIT_REF" = "$APPROVED_BRANCH" ]; then
  echo 'AVK-U02 guard: approved preview branch, building'; exit 1
fi
echo 'AVK-U02 guard: not an approved preview branch, build skipped'; exit 0
