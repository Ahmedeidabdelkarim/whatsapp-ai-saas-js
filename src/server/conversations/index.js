import { prisma } from "@/lib/db/prisma";
import { sessionExpired } from "@/lib/crm/stage";
import { recordEvent } from "@/server/events";
import { publish } from "@/lib/realtime/bus";
export const listConversations = (storeId) => prisma.conversation.findMany({
    where: { storeId, status: { not: "CLOSED" } },
    include: { customer: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" }, take: 100,
});
export const getConversation = (storeId, id) => prisma.conversation.findFirst({ where: { id, storeId }, include: { customer: true, messages: { orderBy: { createdAt: "asc" } }, cart: { include: { items: { include: { product: true } } } } } });
/**
 * One conversation = one session. After 24h of silence an AI-handled chat is closed and a new session starts
 * (this is what the monthly conversation quota and the per-session AI budget count). The cart and welcome state carry over.
 * Chats waiting for / connected to a human don't expire by themselves.
 */
export async function getOrCreateConversation(storeId, customerId) {
    const last = await prisma.conversation.findFirst({ where: { storeId, customerId, status: { not: "CLOSED" } }, orderBy: { createdAt: "desc" } });
    if (last && (last.status !== "ACTIVE" || !sessionExpired(last.lastMessageAt)))
        return last;
    const welcomedBefore = !!last || !!(await prisma.conversation.findFirst({ where: { storeId, customerId, welcomed: true }, select: { id: true } }));
    const keep = last && ["INTERESTED", "IN_CART", "CHECKOUT", "ABANDONED"].includes(last.stage);
    return prisma.$transaction(async (tx) => {
        if (last)
            await tx.conversation.update({ where: { id: last.id }, data: { status: "CLOSED" } });
        const conv = await tx.conversation.create({ data: { storeId, customerId, welcomed: welcomedBefore, stage: keep ? last.stage : "INQUIRY" } });
        if (last)
            await tx.cart.updateMany({ where: { conversationId: last.id }, data: { conversationId: conv.id } });
        return conv;
    });
}
export async function logMessage(conversationId, direction, body, type = "TEXT", waMessageId, sender) {
    const [msg, conv] = await prisma.$transaction([
        prisma.message.create({ data: { conversationId, direction, body, type, waMessageId, sender: sender ?? (direction === "IN" ? "CUSTOMER" : "BOT") } }),
        prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), ...(direction === "IN" ? { followUpSent: false } : {}) } }),
    ]);
    publish(conv.storeId, { type: "message", conversationId, direction }); // dashboards show it instantly
    return msg;
}
/** AI -> waiting for a human (WAITING_FOR_AGENT in the product plan). From here the AI must stay silent. */
export async function requestHuman(conversationId) {
    const c = await prisma.conversation.update({ where: { id: conversationId }, data: { status: "HANDOFF" } });
    await recordEvent({ conversationId, type: "HUMAN_REQUEST" });
    publish(c.storeId, { type: "conversation", conversationId });
}
/** A human is now in the chat (first staff reply, or "take over" in the dashboard). */
export async function staffConnected(conversationId) {
    const c = await prisma.conversation.update({ where: { id: conversationId }, data: { status: "STAFF_ACTIVE" } });
    publish(c.storeId, { type: "conversation", conversationId });
}
/** Human done -> AI answers again. Stage goes back to the cart if there is one. */
export async function returnToAi(storeId, conversationId) {
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, storeId }, include: { cart: { include: { items: true } } } });
    if (!conv)
        return;
    await prisma.conversation.update({ where: { id: conv.id }, data: { status: "ACTIVE", aiTokens: 0, stage: conv.cart?.items.length ? "IN_CART" : "INQUIRY" } });
    publish(storeId, { type: "conversation", conversationId });
}
/** The customer wrote again after abandoning: they're back in their cart. */
export async function resumeFromAbandoned(conversationId) {
    const cart = await prisma.cart.findUnique({ where: { conversationId }, include: { items: true } });
    const c = await prisma.conversation.update({ where: { id: conversationId }, data: { stage: cart?.items.length ? "IN_CART" : "INQUIRY" } });
    publish(c.storeId, { type: "conversation", conversationId });
}
/** True while a human owns the chat. The AI must never reply in this state. */
export async function humanInControl(conversationId) {
    const c = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { status: true } });
    return !!c && (c.status === "HANDOFF" || c.status === "STAFF_ACTIVE");
}
