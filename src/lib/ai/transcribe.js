import { aiModel, isGemini } from "./config";
/** Voice-note -> text via Gemini's native API (accepts OGG/Opus, which is what WhatsApp voice notes are). Null when unsupported. */
export async function transcribe(buf, mime) {
    if (!isGemini() || !process.env.OPENAI_API_KEY)
        return null;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel()}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.OPENAI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [
                        { text: "اكتب نص هذا المقطع الصوتي حرفياً كما قيل، بدون أي إضافة أو شرح." },
                        { inline_data: { mime_type: mime.split(";")[0], data: buf.toString("base64") } },
                    ] }] }),
        signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
        console.error("[voice] transcription failed", res.status, (await res.text()).slice(0, 200));
        return null;
    }
    const j = (await res.json());
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text || null;
}
