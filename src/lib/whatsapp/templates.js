import { graphBase, waSend } from "./client";
export const TEMPLATE_NAME = "cart_followup";
const BODY = "أهلاً {{1}} 👋\nلاحظنا إنك تركت منتجات في سلتك عندنا. تحب نكمل طلبك؟ اكتب لنا وبنخدمك.";
const errText = (j) => j.error?.error_user_msg ?? j.error?.message ?? "خطأ غير معروف من Meta";
/** Submits `cart_followup` (Arabic, MARKETING) for Meta review. Needs the WhatsApp Business Account ID + a token with whatsapp_business_management. */
export async function createFollowUpTemplate(wabaId, token) {
    const res = await fetch(`${graphBase()}/${wabaId}/message_templates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            name: TEMPLATE_NAME, language: "ar", category: "MARKETING",
            components: [{ type: "BODY", text: BODY, example: { body_text: [["أحمد"]] } }],
        }),
        signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json().catch(() => ({})));
    return res.ok ? { ok: true, message: "تم إرسال القالب لمراجعة Meta. عادةً يُعتمد خلال دقائق إلى 24 ساعة." } : { ok: false, message: errText(j) };
}
/** APPROVED | PENDING | REJECTED | PAUSED | DISABLED, or null when the template doesn't exist (or the lookup failed). */
export async function getTemplateStatus(wabaId, token) {
    try {
        const res = await fetch(`${graphBase()}/${wabaId}/message_templates?name=${TEMPLATE_NAME}&fields=name,status,language`, {
            headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok)
            return null;
        const j = (await res.json());
        return j.data?.find((t) => t.language === "ar")?.status ?? j.data?.[0]?.status ?? null;
    }
    catch {
        return null;
    }
}
export const sendFollowUpTemplate = (c, to, name) => waSend(c, {
    to, type: "template",
    template: { name: TEMPLATE_NAME, language: { code: "ar" },
        components: [{ type: "body", parameters: [{ type: "text", text: name || "عميلنا العزيز" }] }] },
});
