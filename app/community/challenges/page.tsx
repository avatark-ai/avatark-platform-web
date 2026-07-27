import type { Metadata } from "next";
import { DISCOVER_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Challenges — Community — Echo",
  description: "Shared practices with a defined invitation, time window, and contribution.",
};

export default function ChallengesPage() {
  return (
    <CommunitySectionShell
      title="Challenges"
      purpose="Shared practices with a defined invitation, time window, and contribution."
    >
      <CommunityEmptyState
        body="No public challenges are open yet."
        ctaLabel="Explore practices"
        ctaHref={`${DISCOVER_HREF}?view=practices`}
      />
    </CommunitySectionShell>
  );
}
