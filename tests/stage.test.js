import { test } from "node:test";
import assert from "node:assert/strict";
import { stageAfter, sessionExpired, SESSION_MS } from "../src/lib/crm/stage";
test("shopping events move the stage forward only", () => {
    assert.equal(stageAfter("INQUIRY", "INTEREST"), "INTERESTED");
    assert.equal(stageAfter("INTERESTED", "ADD_TO_CART"), "IN_CART");
    assert.equal(stageAfter("IN_CART", "CHECKOUT"), "CHECKOUT");
    assert.equal(stageAfter("IN_CART", "INTEREST"), "IN_CART"); // browsing more doesn't go backwards
    assert.equal(stageAfter("CHECKOUT", "ADD_TO_CART"), "CHECKOUT");
});
test("completed, abandoned and human override", () => {
    assert.equal(stageAfter("IN_CART", "COMPLETED"), "COMPLETED");
    assert.equal(stageAfter("IN_CART", "ABANDONED"), "ABANDONED");
    assert.equal(stageAfter("INQUIRY", "HUMAN_REQUEST"), "HUMAN");
    assert.equal(stageAfter("HUMAN", "ADD_TO_CART"), "HUMAN"); // stays with the human until returned to AI
});
test("a returning customer restarts the journey", () => {
    assert.equal(stageAfter("COMPLETED", "INTEREST"), "INTERESTED");
    assert.equal(stageAfter("ABANDONED", "ADD_TO_CART"), "IN_CART");
});
test("session expires after 24h of silence", () => {
    const now = Date.now();
    assert.equal(sessionExpired(new Date(now - SESSION_MS + 1000), now), false);
    assert.equal(sessionExpired(new Date(now - SESSION_MS - 1000), now), true);
});
