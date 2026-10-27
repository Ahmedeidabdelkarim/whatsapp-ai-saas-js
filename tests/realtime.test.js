import { test } from "node:test";
import assert from "node:assert/strict";
import { publish, subscribe } from "../src/lib/realtime/bus";
import { sseData, SSE_PING } from "../src/lib/realtime/sse";
test("a subscriber only receives its own store's events (tenant isolation)", () => {
    const a = [], b = [];
    const offA = subscribe("storeA", (e) => a.push(e)), offB = subscribe("storeB", (e) => b.push(e));
    publish("storeA", { type: "message", conversationId: "c1", direction: "IN" });
    publish("storeB", { type: "conversation", conversationId: "c9" });
    assert.equal(a.length, 1);
    assert.equal(a[0].conversationId, "c1");
    assert.equal(a[0].direction, "IN");
    assert.equal(b.length, 1);
    assert.equal(b[0].conversationId, "c9");
    offA();
    offB();
});
test("unsubscribe stops delivery", () => {
    const got = [];
    const off = subscribe("s", (e) => got.push(e));
    publish("s", { type: "sync" });
    off();
    publish("s", { type: "sync" });
    assert.equal(got.length, 1);
});
test("events are timestamped", () => {
    let at = 0;
    const off = subscribe("t", (e) => { at = e.at; });
    publish("t", { type: "sync" });
    off();
    assert.ok(Math.abs(Date.now() - at) < 1000);
});
test("SSE frames are well formed", () => {
    assert.equal(sseData({ type: "message" }), 'data: {"type":"message"}\n\n');
    assert.ok(SSE_PING.startsWith(":") && SSE_PING.endsWith("\n\n"));
});
