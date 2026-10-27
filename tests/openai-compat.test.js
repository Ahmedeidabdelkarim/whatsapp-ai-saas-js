import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { toOpenAiTools, runOpenAiLoop } from "../src/lib/ai/openai-compat";
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
test("tool schemas convert; empty properties are omitted (Gemini rejects them)", () => {
    const t = toOpenAiTools([
        { name: "a", description: "d", input_schema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] } },
        { name: "b", description: "d", input_schema: { type: "object", properties: {}, required: [] } },
    ]);
    assert.equal(t[0].function.parameters?.required?.[0], "q");
    assert.equal(t[1].function.parameters, undefined);
});
test("loop runs a tool, echoes the assistant message verbatim (thought signature), then returns text", async () => {
    const bodies = [];
    const replies = [
        { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "search_products", arguments: '{"query":"عود"}' }, extra_content: { google: { thought_signature: "SIG123" } } }] } }], usage: { completion_tokens: 30 } },
        { choices: [{ message: { role: "assistant", content: "عندنا عود ملكي 320 ريال" } }], usage: { completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 20 } } },
    ];
    globalThis.fetch = (async (_u, init) => { bodies.push(JSON.parse(init.body)); return new Response(JSON.stringify(replies.shift()), { status: 200 }); });
    const ran = [];
    const r = await runOpenAiLoop({
        baseUrl: "https://x.test/v1", apiKey: "k", model: "m", system: "sys", history: [{ role: "user", content: "عندكم عود؟" }],
        tools: [{ name: "search_products", input_schema: { properties: { query: { type: "string" } } } }],
        runTool: async (n, a) => { ran.push([n, a]); return [{ name: "عود ملكي" }]; },
    });
    assert.equal(r.text, "عندنا عود ملكي 320 ريال");
    assert.equal(r.usedTools, true);
    assert.equal(r.outputTokens, 30 + 30); // reasoning tokens are not counted against the session budget
    assert.deepEqual(ran, [["search_products", { query: "عود" }]]);
    const second = bodies[1].messages;
    assert.equal(second.at(-2).tool_calls[0].extra_content.google.thought_signature, "SIG123");
    assert.equal(second.at(-1).role, "tool");
    assert.equal(second.at(-1).tool_call_id, "c1");
    assert.equal(second.at(-1).name, "search_products");
});
test("loop stops after a tool asks the customer for input", async () => {
    let requests = 0;
    globalThis.fetch = (async () => {
        requests++;
        return new Response(JSON.stringify({
            choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "show_product_card", arguments: '{"product_id":"p1"}' } }] } }],
            usage: { completion_tokens: 20 },
        }), { status: 200 });
    });
    const result = await runOpenAiLoop({
        baseUrl: "https://x.test/v1", model: "m", system: "sys", history: [],
        tools: [{ name: "show_product_card", input_schema: { properties: { product_id: { type: "string" } } } }],
        runTool: async () => ({ sent: true, awaitingCustomerInput: true }),
    });
    assert.deepEqual(result, { text: "", usedTools: true, outputTokens: 20 });
    assert.equal(requests, 1);
});
test("429 is retried, other errors surface", async () => {
    let n = 0;
    globalThis.fetch = (async () => (++n === 1 ? new Response("slow down", { status: 429 }) : new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })));
    const r = await runOpenAiLoop({ baseUrl: "https://x.test", model: "m", system: "s", history: [], tools: [], runTool: async () => ({}) });
    assert.equal(r.text, "ok");
    assert.equal(n, 2);
    globalThis.fetch = (async () => new Response("bad key", { status: 401 }));
    await assert.rejects(() => runOpenAiLoop({ baseUrl: "https://x.test", model: "m", system: "s", history: [], tools: [], runTool: async () => ({}) }), /AI API 401/);
});
test("an empty reply without tool use is an error, not a silent fallback", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "" }, finish_reason: "length" }] }), { status: 200 }));
    await assert.rejects(() => runOpenAiLoop({ baseUrl: "https://x.test", model: "m", system: "s", history: [], tools: [], runTool: async () => ({}) }), /empty reply \(finish_reason: length\)/);
});
test("429 honours Retry-After", async () => {
    let n = 0;
    const t0 = Date.now();
    globalThis.fetch = (async () => (++n === 1 ? new Response("quota", { status: 429, headers: { "retry-after": "1" } }) : new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })));
    const r = await runOpenAiLoop({ baseUrl: "https://x.test", model: "m", system: "s", history: [], tools: [], runTool: async () => ({}) });
    assert.equal(r.text, "ok");
    assert.ok(Date.now() - t0 >= 900 && Date.now() - t0 < 1900);
});

test("a model that rejects reasoning_effort is retried without it, and remembered", async () => {
  const bodies = [];
  globalThis.fetch = (async (_u, init) => {
    const b = JSON.parse(init.body); bodies.push(b);
    return b.reasoning_effort
      ? new Response('{"error":{"message":"Unknown field reasoning_effort"}}', { status: 400 })
      : new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  });
  const run = () => runOpenAiLoop({ baseUrl: "https://effort.test", model: "m-effort", system: "s", history: [], tools: [], runTool: async () => ({}), reasoningEffort: "low" });
  assert.equal((await run()).text, "ok");
  assert.equal(bodies.length, 2); assert.equal(bodies[0].reasoning_effort, "low"); assert.equal(bodies[1].reasoning_effort, undefined);
  assert.equal((await run()).text, "ok");           // second run: no wasted failing request
  assert.equal(bodies.length, 3); assert.equal(bodies[2].reasoning_effort, undefined);
});
test("other 400 errors are not swallowed by that retry", async () => {
  globalThis.fetch = (async () => new Response('{"error":{"message":"API key not valid"}}', { status: 400 }));
  await assert.rejects(() => runOpenAiLoop({ baseUrl: "https://k.test", model: "m-key", system: "s", history: [], tools: [], runTool: async () => ({}), reasoningEffort: "low" }), /API key not valid/);
});
