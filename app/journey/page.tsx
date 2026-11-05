import { guardExcludedSegment } from '@/lib/release/guards'
// Bare /journey is normalized to /journey/today by the layout itself
// (see app/journey/layout.tsx) -- that runs regardless of auth state,
// which this page, as a child only ever rendered once signed in, could
// not.
export default function JourneyIndexPage() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  return null
}
