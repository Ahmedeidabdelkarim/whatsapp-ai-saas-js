import { prisma } from "@/lib/db/prisma";
import { startOfMonth } from "@/lib/utils/format";
const DAY = 864e5;
/** Abandoned = cart has items, no new message for 24h, not yet followed up, and the bot isn't handed off. */
export const abandonedWhere = (storeId) => ({
    storeId, followUpSent: false, status: "ACTIVE",
    lastMessageAt: { lt: new Date(Date.now() - DAY) },
    cart: { is: { items: { some: {} } } },
});
export async function getFunnel(storeId) {
    const since = startOfMonth();
    const [leads, active, orders, abandoned, top] = await Promise.all([
        prisma.customer.count({ where: { storeId, createdAt: { gte: since } } }),
        prisma.conversation.count({ where: { storeId, status: "ACTIVE", lastMessageAt: { gte: new Date(Date.now() - DAY) } } }),
        prisma.order.count({ where: { storeId, createdAt: { gte: since }, status: { in: ["PAID", "FULFILLED"] } } }),
        prisma.conversation.count({ where: abandonedWhere(storeId) }),
        prisma.customerEvent.groupBy({ by: ["productId"], where: { storeId, productId: { not: null }, type: { in: ["INTEREST", "ADD_TO_CART"] }, createdAt: { gte: since } }, _count: { productId: true }, orderBy: { _count: { productId: "desc" } }, take: 3 }),
    ]);
    const total = top.reduce((s, t) => s + t._count.productId, 0) || 1;
    const names = await prisma.product.findMany({ where: { id: { in: top.map((t) => t.productId) } }, select: { id: true, name: true } });
    return {
        leads, active, orders, abandoned,
        topProducts: top.map((t) => ({ name: names.find((n) => n.id === t.productId)?.name ?? "—", share: Math.round((t._count.productId / total) * 100) })),
    };
}
const distinctConvs = async (storeId, type, since) => (await prisma.customerEvent.findMany({ where: { storeId, type, createdAt: { gte: since } }, distinct: ["conversationId"], select: { conversationId: true } })).length;
/** The nine indicators from the product spec, for the current month (customers = all time). */
export async function getKpis(storeId) {
    const since = startOfMonth();
    const [totalCustomers, productInquiries, addedToCart, abandoned, completed, humanRequests, activeConversations, sessions, top] = await Promise.all([
        prisma.customer.count({ where: { storeId } }),
        prisma.productInquiry.count({ where: { product: { storeId }, createdAt: { gte: since } } }),
        distinctConvs(storeId, "ADD_TO_CART", since),
        prisma.conversation.count({ where: { storeId, stage: "ABANDONED" } }),
        distinctConvs(storeId, "COMPLETED", since),
        distinctConvs(storeId, "HUMAN_REQUEST", since),
        prisma.conversation.count({ where: { storeId, status: { not: "CLOSED" }, lastMessageAt: { gte: new Date(Date.now() - DAY) } } }),
        prisma.conversation.count({ where: { storeId, createdAt: { gte: since } } }),
        prisma.customerEvent.groupBy({ by: ["productId"], where: { storeId, productId: { not: null }, createdAt: { gte: since } }, _count: { productId: true }, orderBy: { _count: { productId: "desc" } }, take: 5 }),
    ]);
    const names = await prisma.product.findMany({ where: { id: { in: top.map((t) => t.productId) } }, select: { id: true, name: true } });
    return {
        totalCustomers, productInquiries, addedToCart, abandoned, completed, humanRequests, activeConversations,
        conversionRate: sessions ? Math.round((completed / sessions) * 100) : 0,
        mostRequested: top.map((t) => ({ name: names.find((n) => n.id === t.productId)?.name ?? "—", count: t._count.productId })),
    };
}
export async function getStageBreakdown(storeId) {
    const rows = await prisma.conversation.groupBy({ by: ["stage"], where: { storeId, status: { not: "CLOSED" } }, _count: { stage: true } });
    return Object.fromEntries(rows.map((r) => [r.stage, r._count.stage]));
}
