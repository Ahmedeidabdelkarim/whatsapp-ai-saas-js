/** Gemini rejects OBJECT schemas with empty `properties`/`required`, so those are omitted. */
export function toOpenAiTools(defs) {
    return defs.map((d) => {
        const { properties, required, ...rest } = d.input_schema;
        const hasProps = !!properties && Object.keys(properties).length > 0;
        return {
            type: "function",
            function: {
                name: d.name, description: d.description,
                ...(hasProps ? { parameters: { ...rest, type: "object", properties, ...(required?.length ? { required } : {}) } } : {}),
            },
        };
    });
}
// Models/providers that rejected `reasoning_effort`: we stop sending it instead of failing every message.
const noEffort = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Free tiers rate-limit hard: retry 429/5xx a couple of times before giving up. */
async function post(url, key, body) {
    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
            body: JSON.stringify(body), signal: AbortSignal.timeout(45_000),
        });
        if (res.ok)
            return res.json();
        last = `${res.status}: ${(await res.text()).slice(0, 300)}`;
        if ((res.status === 429 || res.status >= 500) && attempt < 2) {
            const ra = Number(res.headers.get("retry-after"));
            await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2000 * (attempt + 1), 20_000));
            continue;
        }
        break;
    }
    throw new Error(`AI API ${last}`);
}
export async function runOpenAiLoop(o) {
    const messages = [{ role: "system", content: o.system }, ...o.history];
    const tools = toOpenAiTools(o.tools);
    let usedTools = false, outputTokens = 0;
    for (let step = 0; step < (o.maxSteps ?? 6); step++) {
        const effortKey = `${o.baseUrl}|${o.model}`;
        const send = (effort) => post(`${o.baseUrl}/chat/completions`, o.apiKey, {
            model: o.model, messages, tools, tool_choice: "auto", max_tokens: o.maxTokens ?? 4096, // thinking models spend part of this on reasoning; too small = empty answers
            ...(effort ? { reasoning_effort: effort } : {}),
        });
        const effort = noEffort.has(effortKey) ? undefined : o.reasoningEffort;
        let data;
        try {
            data = await send(effort);
        }
        catch (e) {
            if (!(effort && /AI API 400/.test(e.message) && /reasoning|thinking/i.test(e.message)))
                throw e;
            console.warn(`[ai] ${o.model} rejected reasoning_effort, retrying without it. Set AI_REASONING_EFFORT="" in .env to silence this.`);
            noEffort.add(effortKey);
            data = await send(undefined);
        }
        const u = data.usage;
        if (u)
            outputTokens += Math.max(0, (u.completion_tokens ?? 0) - (u.completion_tokens_details?.reasoning_tokens ?? 0));
        const msg = data.choices?.[0]?.message;
        if (!msg)
            throw new Error("AI API returned no message");
        if (!msg.tool_calls?.length) {
            const text = typeof msg.content === "string" ? msg.content.trim() : "";
            if (!text && !usedTools)
                throw new Error(`AI returned an empty reply (finish_reason: ${data.choices?.[0]?.finish_reason ?? "unknown"})`);
            return { text, usedTools, outputTokens };
        }
        usedTools = true;
        messages.push(msg); // verbatim: Gemini 3 needs its thought signatures (extra_content) echoed back with the tool calls
        for (const call of msg.tool_calls) {
            let args = {};
            try {
                args = JSON.parse(call.function.arguments || "{}");
            }
            catch { /* model sent bad JSON: run with no args */ }
            let result;
            try {
                result = await o.runTool(call.function.name, args);
            }
            catch (e) {
                result = { error: e.message };
            }
            if (result?.awaitingCustomerInput)
                return { text: "", usedTools: true, outputTokens };
            messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
        }
    }
    return { text: "عذراً، صار عندي خلل بسيط. ممكن تعيد سؤالك؟", usedTools, outputTokens };
}
