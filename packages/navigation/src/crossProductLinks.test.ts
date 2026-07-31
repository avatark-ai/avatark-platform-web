import { test } from "node:test";
import assert from "node:assert/strict";
import {
  watchLink,
  practiceLink,
  echoLink,
  arenaLink,
  studioLink,
  gameLink,
  parseLocalDeepLinkPath,
} from "./crossProductLinks.ts";

test("watchLink builds the real static /watch-first route when no slug is given", () => {
  const link = watchLink();
  assert.equal(link.local, true);
  assert.equal(link.productId, "avatark");
  assert.equal(link.path, "/watch-first");
  assert.equal(link.href, "/watch-first");
});

test("watchLink builds a per-story path when a slug is given", () => {
  const link = watchLink("the-returner");
  assert.equal(link.path, "/watch-first/the-returner");
});

test("practiceLink builds this repo's own local /practice/{id} route", () => {
  const link = practiceLink("the-promise-to-myself");
  assert.equal(link.local, true);
  assert.equal(link.path, "/practice/the-promise-to-myself");
});

test("echoLink builds this repo's own local /echo/{slug} route", () => {
  const link = echoLink("the-returner");
  assert.equal(link.local, true);
  assert.equal(link.path, "/echo/the-returner");
});

test("arenaLink resolves a cross-product URL against ArenaK's real domain", () => {
  const link = arenaLink("/cohort/abc");
  assert.equal(link.local, false);
  assert.equal(link.productId, "arenak");
  assert.equal(link.href, "https://arenak.ai/cohort/abc");
});

test("studioLink and gameLink resolve against their own products' domains, never a hard-coded literal", () => {
  assert.equal(studioLink().href, "https://studiok.dt4m.ai/");
  assert.equal(gameLink("/flowk").href, "https://gamek.ai/flowk");
});

test("parseLocalDeepLinkPath recognizes all three local kinds and round-trips their slug", () => {
  assert.deepEqual(parseLocalDeepLinkPath("/watch-first/the-returner"), { kind: "watch", rest: "the-returner" });
  assert.deepEqual(parseLocalDeepLinkPath("/watch-first"), { kind: "watch", rest: "" });
  assert.deepEqual(parseLocalDeepLinkPath("/practice/the-promise-to-myself"), {
    kind: "practice",
    rest: "the-promise-to-myself",
  });
  assert.deepEqual(parseLocalDeepLinkPath("/echo/the-returner"), { kind: "echo", rest: "the-returner" });
});

test("parseLocalDeepLinkPath returns null for a path that isn't one of the three local kinds", () => {
  assert.equal(parseLocalDeepLinkPath("/account"), null);
  assert.equal(parseLocalDeepLinkPath("/arena/anything"), null);
});
