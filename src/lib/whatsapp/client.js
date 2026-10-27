import crypto from "crypto";
export const graphBase = () => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v21.0"}`;
export async function waSend(c, payload) {
    const res = await fetch(`${graphBase()}/${c.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${c.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
    });
    if (!res.ok)
        console.error("WhatsApp send failed", res.status, await res.text());
    return res.ok;
}
/** Validates Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(raw, header) {
    if (!header)
        return false;
    const expected = "sha256=" + crypto.createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(header);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
