import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, createEmbeddings, productEmbeddingText } from "../src/lib/ai/embeddings";

test("cosine similarity ranks aligned vectors and rejects incompatible vectors", () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
    assert.equal(cosineSimilarity([1, 0], [1]), null);
    assert.equal(cosineSimilarity([0, 0], [1, 0]), null);
});

test("product embedding text includes semantic catalog context, not mutable price or stock", () => {
    const text = productEmbeddingText({
        name: "عطر ملكي",
        description: "رائحة شرقية فاخرة",
        category: { name: "رجالي", parent: { name: "عطور" } },
        brand: { name: "عبق" },
        priceHalalas: 50000,
        stock: 3,
    });
    assert.ok(text.includes("عطر ملكي"));
    assert.ok(text.includes("القسم الرئيسي: عطور"));
    assert.ok(text.includes("الماركة: عبق"));
    assert.ok(!text.includes("50000"));
});

test("embeddings are requested in a batch and returned in input order", async (t) => {
    const env = ["AI_EMBEDDING_BASE_URL", "AI_EMBEDDING_API_KEY", "AI_EMBEDDING_MODEL", "OPENAI_BASE_URL", "OPENAI_API_KEY"].map((key) => [key, process.env[key]]);
    t.after(() => {
        for (const [key, value] of env) {
            if (value === undefined)
                delete process.env[key];
            else
                process.env[key] = value;
        }
        mock.restoreAll();
    });
    process.env.AI_EMBEDDING_BASE_URL = "https://embeddings.test/v1";
    process.env.AI_EMBEDDING_API_KEY = "test-key";
    process.env.AI_EMBEDDING_MODEL = "test-model";
    const fetch = mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://embeddings.test/v1/embeddings");
        assert.equal(options.headers.Authorization, "Bearer test-key");
        assert.deepEqual(JSON.parse(options.body).input, ["عبارة ألف", "عبارة باء"]);
        return new Response(JSON.stringify({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] }), { status: 200 });
    });
    assert.deepEqual(await createEmbeddings(["عبارة ألف", "عبارة باء"]), [[1, 0], [0, 1]]);
    assert.equal(fetch.mock.callCount(), 1);
});
