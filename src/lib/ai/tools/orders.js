import { recordEvent } from "@/server/events";
import { createOrderWithInvoice, sendPaymentLink } from "@/server/orders/checkout-flow";
import { sar } from "@/lib/utils/format";
export const createOrderTool = {
    def: {
        name: "create_order",
        description: "حوّل السلة إلى طلب بعد تأكيد العنوان والإجمالي من العميل. يرسل رابط الدفع للعميل تلقائياً إذا كان الدفع الإلكتروني مفعّلاً.",
        input_schema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
    },
    async run(ctx, i) {
        await recordEvent({ conversationId: ctx.conversationId, type: "CHECKOUT" });
        const r = await createOrderWithInvoice(ctx.storeId, ctx.conversationId, ctx.customerId, String(i.address));
        if (!r.ok)
            return { error: r.error };
        await sendPaymentLink({ creds: ctx.creds, to: ctx.customerWaId, conversationId: ctx.conversationId }, r.label, r.totalHalalas, r.paymentUrl, r.items);
        return { order_id: r.label, total: sar(r.totalHalalas), status: "PENDING", payment_link_sent: !!r.paymentUrl };
    },
};
