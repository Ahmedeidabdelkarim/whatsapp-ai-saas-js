import { openAiBaseUrl } from "./config";

const cache = new Map();
let warnedMissingConfig = false;
const MAX_CACHE_SIZE = 256;

export function embeddingConfig() {
    const baseUrl = (process.env.AI_EMBEDDING_BASE_URL || openAiBaseUrl()).replace(/\/$/, "");
    const apiKey = process.env.AI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
    const local = /localhost|127\.0\.0\.1/.test(baseUrl);
    const model = process.env.AI_EMBEDDING_MODEL || (baseUrl.includes("generativelanguage.googleapis.com") ? "gemini-embedding-001" : "text-embedding-3-small");
    return { baseUrl, apiKey, model, configured: !!apiKey || local };
}

export function productEmbeddingText(product) {
    return [
        product.name,
        product.description,
        product.category?.name ? `القسم: ${product.category.name}` : "",
        product.category?.parent?.name ? `القسم الرئيسي: ${product.category.parent.name}` : "",
        product.brand?.name ? `الماركة: ${product.brand.name}` : "",
    ].filter(Boolean).join("\n").slice(0, 4000);
}

export function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length)
        return null;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        if (typeof a[i] !== "number" || typeof b[i] !== "number" || !Number.isFinite(a[i]) || !Number.isFinite(b[i]))
            return null;
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (!normA || !normB)
        return null;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function createEmbeddings(texts) {
    const inputs = texts.map((text) => String(text).trim());
    if (!inputs.length || inputs.some((input) => !input))
        return null;
    const config = embeddingConfig();
    if (!config.configured) {
        if (!warnedMissingConfig) {
            console.warn("[ai] semantic product search is disabled: set AI_EMBEDDING_API_KEY or OPENAI_API_KEY");
            warnedMissingConfig = true;
        }
        return null;
    }
    const keys = inputs.map((input) => `${config.baseUrl}|${config.model}|${input}`);
    const vectors = new Array(inputs.length);
    const missingIndices = [];
    for (let i = 0; i < keys.length; i++) {
        if (cache.has(keys[i]))
            vectors[i] = cache.get(keys[i]);
        else
            missingIndices.push(i);
    }
    if (!missingIndices.length)
        return vectors;
    const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
        body: JSON.stringify({ model: config.model, input: missingIndices.map((i) => inputs[i]) }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
        throw new Error(`Embedding API ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json();
    const rows = Array.isArray(data.data) ? data.data.slice().sort((a, b) => a.index - b.index) : [{ embedding: data.embedding }];
    if (rows.length !== missingIndices.length)
        throw new Error("Embedding API returned an unexpected number of vectors");
    for (let j = 0; j < missingIndices.length; j++) {
        const vector = rows[j]?.embedding;
        if (!Array.isArray(vector) || !vector.length || vector.some((n) => typeof n !== "number" || !Number.isFinite(n)))
            throw new Error("Embedding API returned an invalid vector");
        const index = missingIndices[j];
        vectors[index] = vector;
        if (cache.size >= MAX_CACHE_SIZE)
            cache.delete(cache.keys().next().value);
        cache.set(keys[index], vector);
    }
    return vectors;
}

export async function createEmbedding(text) {
    const vectors = await createEmbeddings([text]);
    return vectors?.[0] ?? null;
}
