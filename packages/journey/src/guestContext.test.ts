import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  readGuestContext,
  writeGuestContext,
  markGuestContextClaimed,
  clearGuestContext,
  GUEST_CONTEXT_STORAGE_KEY,
} from "./guestContext.ts";

// node --test has no DOM/localStorage -- a minimal in-memory stand-in,
// same role jsdom would play, scoped to just what this module touches.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

test("readGuestContext: nothing stored reads as null", () => {
  assert.equal(readGuestContext(), null);
});

test("writeGuestContext + readGuestContext: round-trips a fresh write", () => {
  writeGuestContext({ invitationToken: "tok_1", step: "accepted", acceptedAt: "2026-07-27T00:00:00.000Z" });
  const context = readGuestContext();
  assert.equal(context?.invitationToken, "tok_1");
  assert.equal(context?.step, "accepted");
  assert.equal(context?.claimed, false);
});

test("writeGuestContext: merges a patch onto the existing context, never dropping unrelated fields", () => {
  writeGuestContext({ invitationToken: "tok_1", step: "accepted" });
  writeGuestContext({ step: "watch_first", watchFirstContentId: "story-1" });
  const context = readGuestContext();
  assert.equal(context?.invitationToken, "tok_1");
  assert.equal(context?.step, "watch_first");
  assert.equal(context?.watchFirstContentId, "story-1");
});

test("readGuestContext: discards malformed JSON rather than throwing", () => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(
    GUEST_CONTEXT_STORAGE_KEY,
    "{not json"
  );
  assert.equal(readGuestContext(), null);
});

test("readGuestContext: discards a record with a stale/mismatched schema version", () => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(
    GUEST_CONTEXT_STORAGE_KEY,
    JSON.stringify({ schemaVersion: 999, invitationToken: "tok_1" })
  );
  assert.equal(readGuestContext(), null);
});

test("writeGuestContext: rejects an unsafe intendedReturnRoute rather than persisting an open redirect", () => {
  writeGuestContext({ intendedReturnRoute: "https://evil.example.com/phish" });
  const context = readGuestContext();
  assert.equal(context?.intendedReturnRoute, null);
});

test("writeGuestContext: keeps a safe, same-origin intendedReturnRoute", () => {
  writeGuestContext({ intendedReturnRoute: "/witness/the-promise-to-myself" });
  const context = readGuestContext();
  assert.equal(context?.intendedReturnRoute, "/witness/the-promise-to-myself");
});

test("markGuestContextClaimed: flips claimed without disturbing other fields", () => {
  writeGuestContext({ invitationToken: "tok_1", step: "practice_intro" });
  markGuestContextClaimed();
  const context = readGuestContext();
  assert.equal(context?.claimed, true);
  assert.equal(context?.invitationToken, "tok_1");
  assert.equal(context?.step, "practice_intro");
});

test("clearGuestContext: removes the stored context entirely", () => {
  writeGuestContext({ invitationToken: "tok_1" });
  clearGuestContext();
  assert.equal(readGuestContext(), null);
});
