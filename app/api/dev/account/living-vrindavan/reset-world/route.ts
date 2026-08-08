import { NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { resetLivingSystemsSingletonForTests } from '@/lib/livingSystems/singleton'

// Dev/test-only: returns Living Vrindavan's SHARED world simulation to
// its freshly-seeded starting state (Vasanta, tick 0). Exists because
// Sprint 7 introduces the first genuinely PROCESS-WIDE (not per-user)
// piece of state in this app -- every other dev/test isolation
// mechanism here (?dev_user=) isolates visitor-scoped state only, which
// doesn't help a Playwright run that needs a known starting season
// regardless of what an earlier or concurrent test already advanced the
// shared world to. Guarded the same way every other app/api/dev/* route
// already is (404s in production).
export async function POST() {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  await resetLivingSystemsSingletonForTests()
  return NextResponse.json({ reset: true })
}
