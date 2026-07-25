// Typed accessor over content/echo/landing.md -- same convention as
// lib/content/foundation.ts (frontmatter + "## Heading" sections, read via
// lib/content/markdown.ts), kept separate from lib/content/echo.ts since
// this is one editorial document, not a content collection.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseFoundationContent } from "./markdown.ts";

function readEchoDocument(fileName: string) {
  const filePath = path.join(process.cwd(), "content", "echo", fileName);
  return parseFoundationContent(readFileSync(filePath, "utf-8"));
}

export interface EchoLandingContent {
  hero: { eyebrow: string; headline: string; paragraphs: string[] };
  whatIsEcho: { headline: string; paragraphs: string[] };
  borrowFromLife: { headline: string };
  turnWisdom: { headline: string; paragraphs: string[] };
  seeWhatIsChanging: { headline: string };
  practiceWithOthers: { headline: string };
  watchTheStory: { headline: string };
  leaveSomethingForward: { headline: string };
  finalCta: { headline: string; subheading: string; paragraphs: string[] };
}

export function getEchoLandingContent(): EchoLandingContent {
  const content = readEchoDocument("landing.md");
  const byHeading = new Map(content.sections.map((section) => [section.heading, section]));
  const section = (heading: string) =>
    byHeading.get(heading) ?? { heading, fields: {}, paragraphs: [], pullQuotes: [] };

  const hero = section("Hero");
  const whatIsEcho = section("WhatIsEcho");
  const borrowFromLife = section("BorrowFromLife");
  const turnWisdom = section("TurnWisdom");
  const seeWhatIsChanging = section("SeeWhatIsChanging");
  const practiceWithOthers = section("PracticeWithOthers");
  const watchTheStory = section("WatchTheStory");
  const leaveSomethingForward = section("LeaveSomethingForward");
  const finalCta = section("FinalCta");

  return {
    hero: { eyebrow: hero.fields.eyebrow ?? "ECHO", headline: hero.fields.headline ?? "", paragraphs: hero.paragraphs },
    whatIsEcho: { headline: whatIsEcho.fields.headline ?? "", paragraphs: whatIsEcho.paragraphs },
    borrowFromLife: { headline: borrowFromLife.fields.headline ?? "" },
    turnWisdom: { headline: turnWisdom.fields.headline ?? "", paragraphs: turnWisdom.paragraphs },
    seeWhatIsChanging: { headline: seeWhatIsChanging.fields.headline ?? "" },
    practiceWithOthers: { headline: practiceWithOthers.fields.headline ?? "" },
    watchTheStory: { headline: watchTheStory.fields.headline ?? "" },
    leaveSomethingForward: { headline: leaveSomethingForward.fields.headline ?? "" },
    finalCta: {
      headline: finalCta.fields.headline ?? "",
      subheading: finalCta.fields.subheading ?? "",
      paragraphs: finalCta.paragraphs,
    },
  };
}
