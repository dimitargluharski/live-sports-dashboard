const test = require("node:test");
const assert = require("node:assert/strict");
const { computeStartsAt } = require("../scripts/lib/start-times");

test("converts source time (UTC+1) to UTC", () => {
  assert.equal(computeStartsAt("4 November", "14:00", "2026-11-04T10:00:00Z"), "2026-11-04T13:00:00.000Z");
});

test("accepts month-first labels", () => {
  assert.equal(computeStartsAt("November 5", "19:45", "2026-11-04T10:00:00Z"), "2026-11-05T18:45:00.000Z");
});

test("rolls into next year when scraped in late December", () => {
  assert.equal(computeStartsAt("2 January", "20:00", "2026-12-31T10:00:00Z"), "2027-01-02T19:00:00.000Z");
});

test("rolls back to previous year when scraped in early January", () => {
  assert.equal(computeStartsAt("31 December", "20:00", "2027-01-01T01:00:00Z"), "2026-12-31T19:00:00.000Z");
});

test("returns null for unusable labels", () => {
  assert.equal(computeStartsAt("31 February", "20:00", "2026-02-01T00:00:00Z"), null);
  assert.equal(computeStartsAt("4 November", "LIVE", "2026-11-04T10:00:00Z"), null);
  assert.equal(computeStartsAt(undefined, "14:00", "2026-11-04T10:00:00Z"), null);
});
