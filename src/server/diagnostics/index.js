import { prisma } from "@/lib/db/prisma";
import { getLimits } from "@/lib/billing/limits";
import { aiConfigured, aiLabel } from "@/lib/ai/config";
/** The checklist behind "why isn't the bot answering?" */
export async function getDiagnostics(store) {
    const [{ active, plan }, lastIn, failed] = await Promise.all([
        getLimits(store.id),
        prisma.message.findFirst({ where: { direction: "IN", conversation: { storeId: store.id } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.job.findMany({ where: { storeId: store.id, OR: [{ status: "FAILED" }, { lastError: { not: null } }] }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, status: true, lastError: true, updatedAt: true } }),
    ]);
    const checks = [
        { label: "Phone number ID والتوكن محفوظان", ok: !!store.waPhoneNumberId && !!store.waAccessToken, hint: "احفظهما في بطاقة الربط" },
        { label: `مفتاح الذكاء الاصطناعي: ${aiLabel()}`, ok: aiConfigured(), hint: "أضف AI_PROVIDER و OPENAI_API_KEY (Gemini مجاني) في .env وأعد تشغيل npm run dev" },
        { label: "الرد الآلي مفعّل", ok: store.aiEnabled, hint: "فعّله من صفحة المساعد الذكي" },
        { label: `الاشتراك فعّال${plan ? ` (${plan.name})` : ""}`, ok: active, hint: "جدّد الاشتراك من صفحة الاشتراك" },
        { label: lastIn ? `آخر رسالة وصلت ${lastIn.createdAt.toLocaleString("ar-SA")}` : "لم تصل أي رسالة بعد", ok: !!lastIn, hint: "تأكد من الـ webhook واشتراك messages في Meta" },
    ];
    return { checks, failed };
}
