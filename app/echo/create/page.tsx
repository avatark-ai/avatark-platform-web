import type { Metadata } from "next";
import { EchoCreationFlow } from "@/components/echo/onboarding/EchoCreationFlow";
import { pickPracticeForIntention } from "@/lib/content/echo";

export const metadata: Metadata = {
  title: "Create My Echo",
};

const THEMES = ["Change", "Leadership", "Work", "Family", "Health", "Creation"] as const;

export default function EchoCreatePage() {
  const themePracticeMap = Object.fromEntries(
    THEMES.map((theme) => [theme, pickPracticeForIntention(theme.toLowerCase())?.slug ?? ""])
  ) as Record<(typeof THEMES)[number], string>;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 sm:py-20" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <EchoCreationFlow themePracticeMap={themePracticeMap} />
    </main>
  );
}
