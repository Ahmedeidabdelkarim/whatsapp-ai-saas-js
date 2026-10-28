import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/server/events";
export const getCart = (conversationId) => prisma.cart.findUnique({ where: { conversationId }, include: { items: { include: { product: true } } } });
export async function addToCart(storeId, conversationId, productId, quantity) {
    const product = await prisma.product.findFirst({ where: { id: productId, storeId, active: true } });
    if (!product)
        return { ok: false, error: "المنتج غير موجود" };
    const cart = await prisma.cart.upsert({ where: { conversationId }, update: {}, create: { conversationId } });
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    const inCart = existing?.quantity ?? 0;
    const newQty = inCart + quantity;
    if (newQty > product.stock)
        return {
            ok: false,
            error: `عندك بالفعل ${inCart} من ${product.name} في السلة، وإجمالي المتوفر ${product.stock}. تقدر تضيف ${Math.max(0, product.stock - inCart)} فقط.`,
            productName: product.name,
            inCart,
            stock: product.stock,
            maxAdditional: Math.max(0, product.stock - inCart),
        };
    await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        update: { quantity: newQty }, create: { cartId: cart.id, productId, quantity },
    });
    await recordEvent({ conversationId, type: "ADD_TO_CART", productId });
    return { ok: true, name: product.name, quantity: newQty };
}
export async function removeFromCart(conversationId, productId) {
    const cart = await prisma.cart.findUnique({ where: { conversationId } });
    if (cart)
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}
export async function removeCartQuantity(conversationId, productId, quantity) {
    return prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({ where: { conversationId } });
        const item = cart && await tx.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
            include: { product: true },
        });
        if (!item)
            return { ok: false, error: "هذا المنتج لم يعد موجوداً في السلة." };
        if (!Number.isSafeInteger(quantity) || quantity < 1)
            return { ok: false, error: "أدخل كمية صحيحة للحذف." };
        if (quantity > item.quantity)
            return { ok: false, error: `في السلة ${item.quantity} فقط من ${item.product.name}. اكتب كمية أقل أو احذف المنتج بالكامل.` };
        const remaining = item.quantity - quantity;
        if (remaining === 0)
            await tx.cartItem.delete({ where: { id: item.id } });
        else
            await tx.cartItem.update({ where: { id: item.id }, data: { quantity: remaining } });
        return { ok: true, name: item.product.name, removed: quantity, remaining };
    });
}
export async function setCartItemQuantity(storeId, conversationId, productId, quantity) {
    return prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({ where: { conversationId } });
        if (!cart)
            return { ok: false, error: "السلة فارغة" };
        if (quantity === 0) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
            return { ok: true };
        }
        const product = await tx.product.findFirst({ where: { id: productId, storeId, active: true } });
        if (!product)
            return { ok: false, error: "المنتج غير موجود أو غير متاح" };
        if (quantity > product.stock)
            return { ok: false, error: `المتوفر من ${product.name} هو ${product.stock} فقط` };
        await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId } },
            update: { quantity }, create: { cartId: cart.id, productId, quantity },
        });
        return { ok: true };
    });
}
