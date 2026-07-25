import { getEchoLandingContent } from "@/lib/content/echoLanding";
import { EchoHero } from "./EchoHero";
import { WhatIsEchoSection } from "./WhatIsEchoSection";
import { BorrowFromLifeSection } from "./BorrowFromLifeSection";
import { PracticeBridgeSection } from "./PracticeBridgeSection";
import { ReflectionSection } from "./ReflectionSection";
import { CommunityBridgeSection } from "./CommunityBridgeSection";
import { StoryBridgeSection } from "./StoryBridgeSection";
import { PassForwardSection } from "./PassForwardSection";
import { BeginEchoCTA } from "./BeginEchoCTA";

export function EchoLanding() {
  const content = getEchoLandingContent();

  return (
    <main className="flex flex-1 flex-col" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <EchoHero {...content.hero} />
      <WhatIsEchoSection {...content.whatIsEcho} />
      <BorrowFromLifeSection {...content.borrowFromLife} />
      <PracticeBridgeSection {...content.turnWisdom} />
      <ReflectionSection {...content.seeWhatIsChanging} />
      <CommunityBridgeSection {...content.practiceWithOthers} />
      <StoryBridgeSection {...content.watchTheStory} />
      <PassForwardSection {...content.leaveSomethingForward} />
      <BeginEchoCTA {...content.finalCta} />
    </main>
  );
}
