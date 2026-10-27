import { test } from "node:test";
import assert from "node:assert/strict";
import { backoffMs, MAX_ATTEMPTS } from "../src/server/jobs/backoff";
test("backoff doubles per attempt", () => {
    assert.equal(backoffMs(1), 10_000);
    assert.equal(backoffMs(2), 20_000);
    assert.equal(backoffMs(3), 40_000);
});
test("backoff is capped at 10 minutes", () => assert.equal(backoffMs(30), 600_000));
test("gives up after 5 attempts", () => assert.equal(MAX_ATTEMPTS, 5));
