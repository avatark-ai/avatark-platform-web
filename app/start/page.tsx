import { guardExcludedSegment } from '@/lib/release/guards'
import { StartHere } from "@/components/echo/onboarding/StartHere";

export default function StartPage() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  return <StartHere />;
}
