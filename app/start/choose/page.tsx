import { IntentionPicker } from "@/components/echo/onboarding/IntentionPicker";
import { INTENTIONS, type IntentionId } from "@/lib/onboarding/intentions";
import { pickPracticeForIntention } from "@/lib/content/echo";

export default function StartChoosePage() {
  const intentionPracticeMap = Object.fromEntries(
    INTENTIONS.map((intention) => [intention.id, pickPracticeForIntention(intention.id)?.slug ?? ""])
  ) as Record<IntentionId, string>;

  return <IntentionPicker intentionPracticeMap={intentionPracticeMap} />;
}
