import { prisma } from "@/lib/db/prisma";
import { stageAfter } from "@/lib/crm/stage";
import { publish } from "@/lib/realtime/bus";
/** Logs a customer step and moves the conversation's stage. Every WhatsApp action flows through here, so the dashboard stays in sync. */
export async function recordEvent(a) {
    const conv = await prisma.conversation.findUnique({ where: { id: a.conversationId }, select: { storeId: true, customerId: true, stage: true } });
    if (!conv)
        return;
    await prisma.customerEvent.create({ data: { storeId: conv.storeId, conversationId: a.conversationId, customerId: conv.customerId, type: a.type, productId: a.productId } });
    const next = stageAfter(conv.stage, a.type);
    if (next !== conv.stage)
        await prisma.conversation.update({ where: { id: a.conversationId }, data: { stage: next } });
    publish(conv.storeId, { type: "conversation", conversationId: a.conversationId });
}
