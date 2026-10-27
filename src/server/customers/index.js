import { prisma } from "@/lib/db/prisma";
export const listCustomers = (storeId) => prisma.customer.findMany({ where: { storeId }, include: { _count: { select: { orders: true, conversations: true } }, conversations: { orderBy: { lastMessageAt: "desc" }, take: 1, select: { id: true, stage: true, status: true, lastMessageAt: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
export const upsertCustomer = (storeId, waId, name) => prisma.customer.upsert({ where: { storeId_waId: { storeId, waId } }, update: name ? { name } : {}, create: { storeId, waId, name } });
/** Full CRM profile: stage, products asked about, cart, orders, timeline, human handoff. */
export async function getCustomerProfile(storeId, id) {
    const c = await prisma.customer.findFirst({
        where: { id, storeId },
        include: {
            conversations: { orderBy: { lastMessageAt: "desc" }, take: 5, include: { cart: { include: { items: { include: { product: true } } } } } },
            orders: { orderBy: { createdAt: "desc" }, take: 10, include: { items: { include: { product: true } } } },
            events: { orderBy: { createdAt: "desc" }, take: 40 },
        },
    });
    if (!c)
        return null;
    const productIds = [...new Set(c.events.map((e) => e.productId).filter((x) => !!x))];
    const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(products.map((p) => [p.id, p.name]));
    const asked = new Map();
    for (const e of c.events)
        if (e.productId && (e.type === "INTEREST" || e.type === "ADD_TO_CART"))
            asked.set(e.productId, (asked.get(e.productId) ?? 0) + 1);
    return { customer: c, names, asked: [...asked].map(([pid, n]) => ({ name: names.get(pid) ?? "—", n })), humanRequested: c.events.some((e) => e.type === "HUMAN_REQUEST") };
}
