import { prisma } from "@/lib/db/prisma";
import { startOfMonth } from "@/lib/utils/format";
export async function getLimits(storeId) {
    const sub = await prisma.subscription.findUnique({ where: { storeId }, include: { plan: true } });
    const active = !!sub && ["TRIALING", "ACTIVE"].includes(sub.status) && sub.currentPeriodEnd > new Date();
    return { active, plan: sub?.plan ?? null, sub };
}
export async function canAddProduct(storeId) {
    const { active, plan } = await getLimits(storeId);
    if (!active || !plan)
        return false;
    return (await prisma.product.count({ where: { storeId } })) < plan.maxProducts;
}
/** Checked before the AI answers; blocks the bot when the monthly conversation quota is exhausted. */
export async function canHandleConversation(storeId) {
    const { active, plan } = await getLimits(storeId);
    if (!active || !plan)
        return false;
    const used = await prisma.conversation.count({ where: { storeId, createdAt: { gte: startOfMonth() } } });
    return used <= plan.maxConversationsPerMonth;
}
/** Everything the bot needs to know about the plan before answering. */
export async function getEntitlements(storeId) {
    const { active, plan } = await getLimits(storeId);
    if (!active || !plan)
        return { active: false, canChat: false, reason: "الاشتراك غير فعّال", sessionTokens: 0, voice: false, crmFull: false };
    const used = await prisma.conversation.count({ where: { storeId, createdAt: { gte: startOfMonth() } } });
    const canChat = used <= plan.maxConversationsPerMonth;
    return { active, canChat, reason: canChat ? "" : "تجاوز حد المحادثات الشهري", sessionTokens: plan.aiSessionTokens, voice: plan.voiceSupport, crmFull: plan.crmFull };
}
