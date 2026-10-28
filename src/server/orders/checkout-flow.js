import { prisma } from "@/lib/db/prisma";
import { checkoutCart } from "@/server/orders";
import { logMessage } from "@/server/conversations";
import { createInvoice, paymentCallbackUrl } from "@/lib/billing/moyasar";
import { decryptSecret } from "@/lib/utils/secret";
import { sendText } from "@/lib/whatsapp/messages";
import { sar } from "@/lib/utils/format";
/**
 * Cart -> order (stock is taken atomically) -> Moyasar invoice, if the merchant connected a gateway.
 * Shared by the checkout buttons (no AI) and the AI's create_order tool, so both behave the same.
 * The invoice uses the MERCHANT's key: the money goes to the merchant, never to the platform.
 */
export async function createOrderWithInvoice(storeId, conversationId, customerId, address) {
    let order;
    try {
        order = await checkoutCart(storeId, conversationId, customerId, address);
    }
    catch (e) {
        return { ok: false, error: e.message };
    }
    const label = order.id.slice(-6).toUpperCase();
    const payment = await createPaymentLinkForOrder(storeId, order.id);
    await prisma.conversation.update({ where: { id: conversationId }, data: { awaiting: null } });
    return {
        ok: true, orderId: order.id, label, totalHalalas: order.totalHalalas,
        items: order.items,
        paymentUrl: payment.ok ? payment.paymentUrl : null,
        paymentError: payment.ok ? null : payment.error,
    };
}
export async function createPaymentLinkForOrder(storeId, orderId) {
    const [store, order] = await Promise.all([
        prisma.store.findUniqueOrThrow({ where: { id: storeId } }),
        prisma.order.findFirst({ where: { id: orderId, storeId } }),
    ]);
    if (!order)
        return { ok: false, error: "الطلب غير موجود" };
    if (!store.moyasarSecretKey)
        return { ok: false, error: "بوابة Moyasar غير مفعّلة" };
    if (order.paymentUrl)
        return { ok: true, paymentUrl: order.paymentUrl };
    if (order.status !== "PENDING")
        return { ok: false, error: "لا يمكن إنشاء رابط دفع لطلب غير معلّق" };
    const label = order.id.slice(-6).toUpperCase();
    try {
        const inv = await createInvoice(decryptSecret(store.moyasarSecretKey), {
            amountHalalas: order.totalHalalas, description: `طلب #${label} - ${store.name}`, callbackUrl: paymentCallbackUrl(),
        });
        await prisma.order.update({ where: { id: order.id }, data: { paymentRef: inv.id, paymentUrl: inv.url } });
        return { ok: true, paymentUrl: inv.url };
    }
    catch (e) {
        console.error(`[pay] could not create invoice for order ${order.id}:`, e.message);
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}
export async function sendPaymentLink(c, label, totalHalalas, url, items) {
    const summary = items?.length ? `\nالمنتجات:\n${items.map((item) => `• ${item.product.name} × ${item.quantity} — ${sar(item.quantity * item.unitPriceHalalas)}`).join("\n")}` : "";
    const payment = url ? `رابط الدفع:\n${url}` : "فريق المتجر بيتواصل معك لإتمام الدفع.";
    const msg = `تفاصيل طلبك #${label}:${summary}\nالإجمالي: ${sar(totalHalalas)}\n${payment}`;
    const sent = await sendText(c.creds, c.to, msg);
    if (sent)
        await logMessage(c.conversationId, "OUT", msg, "TEXT", undefined, items?.length ? "STAFF" : undefined);
    return sent;
}
