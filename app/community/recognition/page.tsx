import type { Metadata } from "next";
import { START_HERE_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Recognition — Community — Echo",
  description: "Quiet acknowledgment of genuine practice, evidence, contribution, or service.",
};

export default function RecognitionPage() {
  return (
    <CommunitySectionShell
      title="Recognition"
      purpose="Quiet acknowledgment of genuine practice, evidence, contribution, or service."
    >
      <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        Recognition is not a score, streak, popularity ranking, or generic leaderboard.
      </p>
      <CommunityEmptyState
        body="Nothing has been recognized yet because nothing has been contributed yet."
        ctaLabel="Begin a practice"
        ctaHref={START_HERE_HREF}
      />
    </CommunitySectionShell>
  );
}
