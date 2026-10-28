import { prisma } from "@/lib/db/prisma";
import { fetchInvoice } from "@/lib/billing/moyasar";
import { activatePlan } from "@/lib/billing/subscriptions";
import { decryptSecret } from "@/lib/utils/secret";
import { getWaCreds } from "@/lib/whatsapp/creds";
import { sendText } from "@/lib/whatsapp/messages";
import { sar } from "@/lib/utils/format";
import { recordEvent } from "@/server/events";
/**
 * Called by the payment callback. The callback body is untrusted: we re-fetch the invoice from Moyasar
 * with the secret key, require status "paid" and the exact expected amount, and flip state only once.
 */
export async function settleInvoice(invoiceId) {
    const order = await prisma.order.findUnique({ where: { paymentRef: invoiceId }, include: { store: true, customer: true } });
    if (order) {
        if (order.status !== "PENDING")
            return "already";
        if (!order.store.moyasarSecretKey)
            return "no_key";
        const inv = await fetchInvoice(decryptSecret(order.store.moyasarSecretKey), invoiceId);
        if (inv.status !== "paid")
            return "not_paid";
        if (inv.amount !== order.totalHalalas)
            return "amount_mismatch";
        const r = await prisma.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
        if (r.count === 0)
            return "already"; // a concurrent callback won the race
        if (order.conversationId)
            await recordEvent({ conversationId: order.conversationId, type: "COMPLETED" });
        const creds = getWaCreds(order.store);
        if (creds && order.store.isActive)
            await sendText(creds, order.customer.waId, `وصلنا دفعك ✅ شكراً لك!\nطلبك #${order.id.slice(-6).toUpperCase()} (${sar(order.totalHalalas)}) قيد التجهيز.`);
        return "paid";
    }
    const payment = await prisma.payment.findUnique({ where: { gatewayRef: invoiceId } });
    if (payment) {
        if (payment.status === "paid")
            return "already";
        const key = process.env.MOYASAR_SECRET_KEY;
        if (!key)
            return "no_key";
        const inv = await fetchInvoice(key, invoiceId);
        if (inv.status !== "paid")
            return "not_paid";
        if (inv.amount !== payment.amountHalalas)
            return "amount_mismatch";
        const r = await prisma.payment.updateMany({ where: { id: payment.id, status: { not: "paid" } }, data: { status: "paid" } });
        if (r.count === 0)
            return "already";
        await activatePlan(payment.subscriptionId, payment.planId);
        return "paid";
    }
    return "unknown";
}
