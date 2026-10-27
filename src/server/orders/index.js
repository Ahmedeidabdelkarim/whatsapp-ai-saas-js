import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/server/events";
export const listOrders = (storeId) => prisma.order.findMany({ where: { storeId }, include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
/** Turns the conversation's cart into an order inside one transaction and decrements stock atomically. */
export async function checkoutCart(storeId, conversationId, customerId, address) {
    return prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({ where: { conversationId }, include: { items: { include: { product: true } } } });
        if (!cart || cart.items.length === 0)
            throw new Error("السلة فارغة");
        for (const i of cart.items) {
            const r = await tx.product.updateMany({ where: { id: i.productId, storeId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
            if (r.count === 0)
                throw new Error(`نفد مخزون ${i.product.name}`);
        }
        const total = cart.items.reduce((s, i) => s + i.quantity * i.product.priceHalalas, 0);
        const order = await tx.order.create({
            data: { storeId, customerId, conversationId, totalHalalas: total, address,
                items: { create: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceHalalas: i.product.priceHalalas })) } },
        });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        return order;
    });
}
/** Cancelling a not-yet-cancelled order puts its items back in stock (stock is reserved when the order is created). */
export async function setOrderStatus(storeId, id, status) {
    return prisma.$transaction(async (tx) => {
        const o = await tx.order.findFirst({ where: { id, storeId }, include: { items: true } });
        if (!o || o.status === status)
            return;
        if (status === "CANCELED")
            for (const i of o.items)
                await tx.product.updateMany({ where: { id: i.productId, storeId }, data: { stock: { increment: i.quantity } } });
        if (o.status === "CANCELED")
            for (const i of o.items)
                await tx.product.updateMany({ where: { id: i.productId, storeId }, data: { stock: { decrement: i.quantity } } });
        await tx.order.update({ where: { id }, data: { status, ...(status === "PAID" ? { paidAt: new Date() } : {}) } });
        return o.status !== "PAID" && o.status !== "FULFILLED" && (status === "PAID" || status === "FULFILLED") ? o.conversationId : null;
    }).then(async (convId) => { if (convId)
        await recordEvent({ conversationId: convId, type: "COMPLETED" }); });
}
