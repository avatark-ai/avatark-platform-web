import { guardExcludedSegment } from '@/lib/release/guards'
import { IntentionPicker } from "@/components/echo/onboarding/IntentionPicker";
import { INTENTIONS, type IntentionId } from "@/lib/onboarding/intentions";
import { pickPracticeForIntention } from "@/lib/content/echo";

export default function StartChoosePage() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  const intentionPracticeMap = Object.fromEntries(
    INTENTIONS.map((intention) => [intention.id, pickPracticeForIntention(intention.id)?.slug ?? ""])
  ) as Record<IntentionId, string>;

  return <IntentionPicker intentionPracticeMap={intentionPracticeMap} />;
}
