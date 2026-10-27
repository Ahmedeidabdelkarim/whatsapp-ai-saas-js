import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { buildSystemPrompt } from "./prompts";
import { loadHistory } from "./context";
import { humanInControl } from "@/server/conversations";
import { aiConfigured, aiLabel, aiModel, aiProvider, openAiBaseUrl } from "./config";
import { runOpenAiLoop } from "./openai-compat";
import { searchProductsTool, showProductCardTool, listCategoriesTool } from "./tools/products";
import { checkInventoryTool } from "./tools/inventory";
import { addToCartTool, removeFromCartTool, viewCartTool } from "./tools/cart";
import { createOrderTool } from "./tools/orders";
import { humanHandoffTool } from "./tools/human-handoff";
const TOOLS = [listCategoriesTool, searchProductsTool, showProductCardTool, checkInventoryTool, addToCartTool, removeFromCartTool, viewCartTool, createOrderTool, humanHandoffTool];
let _client = null;
/** Created lazily so a missing key gives a clear error at reply time instead of breaking module load. */
function getClient() {
    if (!process.env.ANTHROPIC_API_KEY)
        throw new Error("ANTHROPIC_API_KEY is missing in .env (restart npm run dev after adding it)");
    return (_client ??= new Anthropic({ timeout: 30_000, maxRetries: 2 }));
}
export async function runAgent(ctx) {
    const store = await prisma.store.findUniqueOrThrow({ where: { id: ctx.storeId } });
    const history = await loadHistory(ctx.conversationId);
    const system = buildSystemPrompt(store);
    const runTool = async (name, input) => {
        const tool = TOOLS.find((t) => t.def.name === name);
        if (!tool)
            return { error: "unknown_tool" };
        // A human may take over while the model is still thinking: no tool may message the customer after that.
        if (name !== "human_handoff" && (await humanInControl(ctx.conversationId)))
            return { error: "human_in_control: stop and do not reply" };
        return tool.run(ctx, input);
    };
    if (aiProvider() === "openai") {
        const key = process.env.OPENAI_API_KEY;
        if (!key && !/localhost|127\.0\.0\.1/.test(openAiBaseUrl()))
            throw new Error("OPENAI_API_KEY is missing in .env (get a free Gemini key at aistudio.google.com/apikey)");
        return runOpenAiLoop({
            baseUrl: openAiBaseUrl(), apiKey: key, model: aiModel(), system,
            history: history.map((m) => ({ role: m.role, content: String(m.content) })),
            tools: TOOLS.map((t) => t.def), runTool, reasoningEffort: process.env.AI_REASONING_EFFORT || undefined,
        });
    }
    const client = getClient();
    const messages = history;
    let usedTools = false, outputTokens = 0;
    for (let step = 0; step < 6; step++) {
        const res = await client.messages.create({ model: aiModel(), max_tokens: 800, system, tools: TOOLS.map((t) => t.def), messages });
        outputTokens += res.usage?.output_tokens ?? 0;
        if (res.stop_reason !== "tool_use") {
            return { text: res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim(), usedTools, outputTokens };
        }
        usedTools = true;
        messages.push({ role: "assistant", content: res.content });
        const results = [];
        for (const b of res.content) {
            if (b.type !== "tool_use")
                continue;
            let out;
            try {
                out = await runTool(b.name, b.input);
            }
            catch (e) {
                out = { error: e.message };
            }
            if (out?.awaitingCustomerInput)
                return { text: "", usedTools: true, outputTokens };
            results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
        }
        messages.push({ role: "user", content: results });
    }
    return { text: "عذراً، صار عندي خلل بسيط. ممكن تعيد سؤالك؟", usedTools, outputTokens };
}
/**
 * Sends one tiny request WITH the real tool definitions, so key, model name, reasoning setting and tool schemas
 * are all verified. Used by the dashboard's "test AI" button.
 */
export async function pingAi() {
    if (!aiConfigured())
        return { ok: false, message: "لا يوجد مفتاح للذكاء الاصطناعي في .env (AI_PROVIDER / OPENAI_API_KEY)" };
    try {
        if (aiProvider() === "openai") {
            const r = await runOpenAiLoop({
                baseUrl: openAiBaseUrl(), apiKey: process.env.OPENAI_API_KEY, model: aiModel(), system: "أجب بكلمة واحدة فقط.",
                history: [{ role: "user", content: "قل: جاهز" }], tools: TOOLS.map((t) => t.def),
                runTool: async () => ({ error: "test" }), maxSteps: 1, reasoningEffort: process.env.AI_REASONING_EFFORT || undefined,
            });
            return { ok: true, message: `${aiLabel()} يعمل. رد: ${r.text || "(بدون نص)"}` };
        }
        const res = await getClient().messages.create({ model: aiModel(), max_tokens: 50, tools: TOOLS.map((t) => t.def), messages: [{ role: "user", content: "قل: جاهز" }] });
        const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join(" ");
        return { ok: true, message: `${aiLabel()} يعمل. رد: ${text || "(بدون نص)"}` };
    }
    catch (e) {
        return { ok: false, message: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
    }
}
