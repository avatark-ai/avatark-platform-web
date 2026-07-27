import type { Metadata } from "next";
import { EchoCreationFlow } from "@/components/echo/onboarding/EchoCreationFlow";
import { pickPracticeForIntention } from "@/lib/content/echo";
import { EchoPageShell } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Create My Echo",
};

const THEMES = ["Change", "Leadership", "Work", "Family", "Health", "Creation"] as const;

export default function EchoCreatePage() {
  const themePracticeMap = Object.fromEntries(
    THEMES.map((theme) => [theme, pickPracticeForIntention(theme.toLowerCase())?.slug ?? ""])
  ) as Record<(typeof THEMES)[number], string>;

  return (
    <EchoPageShell width="wide" topPadding="compact" layout="plain" className="items-center" contentClassName="flex flex-col items-center">
      <EchoCreationFlow themePracticeMap={themePracticeMap} />
    </EchoPageShell>
  );
}
