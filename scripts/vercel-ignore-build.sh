#!/bin/sh
# AVK-UNIFICATION-02 Ignored Build Step (adapted from AVK-FACE-REFRESH-02C).
# Reads only documented Vercel System Environment Variables; never prints values.
# Vercel semantics: exit 1 = proceed with the build, exit 0 = skip (CANCELED).
# Production: unchanged (always builds) -- this file only travels with commits that contain it.
# Preview: builds ONLY the approved integration branch; every other branch carrying this file is skipped.
# AVK-UNIFICATION-03E: this commit line previews ONLY the integrated FS-02 + U-03 branch. The FLW-02C
# (34361b1) and U-02D (cc54874) branches keep their own copies of this file and are not affected.
APPROVED_BRANCH="integration/avk-unification-03"
if [ "$VERCEL_ENV" = "production" ]; then echo 'AVK-U02 guard: production, building'; exit 1; fi
if [ "$VERCEL_ENV" = "preview" ] && [ "$VERCEL_GIT_COMMIT_REF" = "$APPROVED_BRANCH" ]; then
  echo 'AVK-U02 guard: approved preview branch, building'; exit 1
fi
echo 'AVK-U02 guard: not an approved preview branch, build skipped'; exit 0
