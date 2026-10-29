import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt } from "../src/lib/ai/prompts";

test("the product flow asks for quantity before adding to cart", () => {
    const prompt = buildSystemPrompt({ name: "متجر تجريبي", aiPersona: "ودود" });
    assert.ok(prompt.includes("كم قطعة تحتاج؟"));
    assert.ok(prompt.includes("استخدم العدد الذي حدده"));
    assert.ok(prompt.includes("لا تضف للسلة إلا بعد موافقته الصريحة"));
    assert.ok(prompt.includes("البحث النصي والدلالي"));
    assert.ok(prompt.includes("لا تخمّن"));
});
