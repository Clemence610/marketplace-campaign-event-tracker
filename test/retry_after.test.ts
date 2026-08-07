import assert from "node:assert/strict";
import test from "node:test";
import { retryAfterMilliseconds } from "../src/infrai_email";

test("reads Retry-After seconds", () => {
  assert.equal(retryAfterMilliseconds("3"), 3_000);
});

test("reads an HTTP date without returning a negative delay", () => {
  const now = Date.parse("2026-08-03T10:00:00Z");
  assert.equal(
    retryAfterMilliseconds("Mon, 03 Aug 2026 10:00:05 GMT", now),
    5_000,
  );
  assert.equal(
    retryAfterMilliseconds("Mon, 03 Aug 2026 09:59:55 GMT", now),
    0,
  );
});
