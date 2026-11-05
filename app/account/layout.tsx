import type { ReactNode } from 'react'
import { guardExcludedSegment } from '@/lib/release/guards'

// AVK-PROD-03A (C3, L2): this segment is excluded from the institutional release scope.
// Fails closed (404) on its own, independently of the proxy allowlist.
export default function ExcludedSegmentLayout({ children }: { children: ReactNode }) {
  guardExcludedSegment()
  return children
}
