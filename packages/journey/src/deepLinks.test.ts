import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enterInvitationLink,
  watchFirstLink,
  practiceIntroLink,
  practiceDetailLink,
  journeyLink,
} from "./deepLinks.ts";

test("enterInvitationLink: builds /enter/{token}, real and available", () => {
  const link = enterInvitationLink("practice:the-promise-to-myself");
  assert.equal(link.href, "/enter/practice%3Athe-promise-to-myself");
  assert.equal(link.step, "invitation_received");
  assert.equal(link.available, true);
});

test("enterInvitationLink: carries an optional intention query param", () => {
  const link = enterInvitationLink("tok_1", { intention: "calm" });
  assert.equal(link.href, "/enter/tok_1?intention=calm");
});

test("watchFirstLink: the static page is real and available with no storySlug", () => {
  const link = watchFirstLink();
  assert.equal(link.href, "/watch-first");
  assert.equal(link.available, true);
});

test("watchFirstLink: a per-story link is prepared but not yet a real route", () => {
  const link = watchFirstLink("story-1");
  assert.equal(link.href, "/watch-first/story-1");
  assert.equal(link.available, false);
});

test("practiceIntroLink: builds /witness/{slug}, real and available, with query params", () => {
  const link = practiceIntroLink("the-promise-to-myself", { invitation: "tok_1", intention: "calm" });
  assert.equal(link.href, "/witness/the-promise-to-myself?invitation=tok_1&intention=calm");
  assert.equal(link.step, "practice_intro");
  assert.equal(link.available, true);
});

test("practiceDetailLink: builds /practice/{id}, real and available", () => {
  const link = practiceDetailLink("the-promise-to-myself");
  assert.equal(link.href, "/practice/the-promise-to-myself");
  assert.equal(link.available, true);
});

test("journeyLink: /journey/today is real without a journeyId", () => {
  const link = journeyLink();
  assert.equal(link.href, "/journey/today");
  assert.equal(link.available, true);
});

test("journeyLink: /journey/{id} is prepared but not yet a real dynamic route", () => {
  const link = journeyLink("j1");
  assert.equal(link.href, "/journey/j1");
  assert.equal(link.available, false);
});
