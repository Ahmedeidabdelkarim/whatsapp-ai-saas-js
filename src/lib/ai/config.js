/**
 * AI_PROVIDER=anthropic -> Claude (needs paid credit)
 * AI_PROVIDER=openai    -> any OpenAI-compatible API: Google Gemini (free tier), Groq, OpenRouter, Ollama...
 */
export const aiProvider = () => (process.env.AI_PROVIDER === "openai" ? "openai" : "anthropic");
export const openAiBaseUrl = () => (process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
export const aiModel = () => process.env.AI_MODEL || (aiProvider() === "openai" ? "gemini-3.8-flash" : "claude-sonnet-4-6");
export const isGemini = () => aiProvider() === "openai" && openAiBaseUrl().includes("generativelanguage.googleapis.com");
export function aiConfigured() {
    if (aiProvider() === "anthropic")
        return !!process.env.ANTHROPIC_API_KEY;
    const local = /localhost|127\.0\.0\.1/.test(openAiBaseUrl()); // Ollama needs no key
    return !!process.env.OPENAI_API_KEY || local;
}
export const aiLabel = () => (aiProvider() === "anthropic" ? "Claude" : isGemini() ? `Gemini (${aiModel()})` : `OpenAI-compatible (${aiModel()})`);
