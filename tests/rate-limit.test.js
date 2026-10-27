import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, _resetRateLimits } from "../src/lib/utils/rate-limit";
beforeEach(() => _resetRateLimits());
test("allows up to the limit then blocks", () => {
    for (let i = 0; i < 3; i++)
        assert.ok(rateLimit("k", 3, 1000, 0).ok);
    const r = rateLimit("k", 3, 1000, 0);
    assert.equal(r.ok, false);
    assert.equal(r.retryAfterMs, 1000);
});
test("window resets after it elapses", () => {
    for (let i = 0; i < 4; i++)
        rateLimit("k", 3, 1000, 0);
    assert.ok(rateLimit("k", 3, 1000, 1001).ok);
});
test("keys are independent", () => {
    for (let i = 0; i < 4; i++)
        rateLimit("a", 3, 1000, 0);
    assert.ok(rateLimit("b", 3, 1000, 0).ok);
});
