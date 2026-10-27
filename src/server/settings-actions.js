"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getStore } from "@/lib/tenant/get-tenant";
import { setOrderStatus } from "@/server/orders";
import { logMessage, returnToAi, staffConnected } from "@/server/conversations";
import { sendText } from "@/lib/whatsapp/messages";
import { abandonedWhere } from "@/server/analytics";
import { createFollowUpTemplate, getTemplateStatus, sendFollowUpTemplate } from "@/lib/whatsapp/templates";
import { getWaCreds } from "@/lib/whatsapp/creds";
import { encryptSecret } from "@/lib/utils/secret";
import { rateLimit } from "@/lib/utils/rate-limit";
import { pingAi } from "@/lib/ai/agent";
import { addToCart, getCart, setCartItemQuantity } from "@/server/carts";
import { createOrderWithInvoice, createPaymentLinkForOrder, sendPaymentLink } from "@/server/orders/checkout-flow";
export async function saveAiAction(fd) {
    const store = await getStore();
    await prisma.store.update({ where: { id: store.id }, data: {
            aiPersona: String(fd.get("aiPersona")), greeting: String(fd.get("greeting")), aiEnabled: fd.get("aiEnabled") === "on"
        } });
    revalidatePath("/dashboard/ai");
}
export async function saveWhatsappAction(fd) {
    const store = await getStore();
    const token = String(fd.get("waAccessToken") ?? "").trim();
    await prisma.store.update({ where: { id: store.id }, data: {
            waPhoneNumberId: String(fd.get("waPhoneNumberId")).trim() || null, waBusinessId: String(fd.get("waBusinessId")).trim() || null,
            ...(token ? { waAccessToken: encryptSecret(token) } : {})
        } });
    revalidatePath("/dashboard/whatsapp");
}
/** Merchant's own Moyasar secret key (sk_...). Order payments are created with it, so money lands in their account. */
export async function saveGatewayAction(fd) {
    const store = await getStore();
    const key = String(fd.get("moyasarSecretKey") ?? "").trim();
    if (fd.get("remove") === "on")
        await prisma.store.update({ where: { id: store.id }, data: { moyasarSecretKey: null } });
    else if (key) {
        if (!/^sk_(test|live)_/.test(key))
            return; // publishable keys (pk_) must never be stored here
        await prisma.store.update({ where: { id: store.id }, data: { moyasarSecretKey: encryptSecret(key) } });
    }
    revalidatePath("/dashboard/settings");
}
export async function orderStatusAction(fd) {
    const store = await getStore();
    await setOrderStatus(store.id, String(fd.get("id")), String(fd.get("status")));
    revalidatePath("/dashboard/orders");
}
/** Human takes over a chat (the bot goes quiet) or hands it back to the AI. */
export async function handoffAction(fd) {
    const store = await getStore();
    const id = String(fd.get("id"));
    if (fd.get("on") === "1") {
        if (await prisma.conversation.findFirst({ where: { id, storeId: store.id } }))
            await staffConnected(id);
    }
    else
        await returnToAi(store.id, id);
    revalidatePath(`/dashboard/conversations/${id}`);
}
/** Staff answer inside the SAME WhatsApp chat/number. Only works inside WhatsApp's 24h window after the customer's last message. */
export async function staffReplyAction(_, fd) {
    const store = await getStore();
    const id = String(fd.get("id"));
    const text = String(fd.get("text") ?? "").trim();
    if (!text)
        return { ok: false, message: "اكتب رسالة" };
    if (!rateLimit(`staff:${store.id}`, 60, 60_000).ok)
        return { ok: false, message: "محاولات كثيرة" };
    const conv = await prisma.conversation.findFirst({ where: { id, storeId: store.id }, include: { customer: true } });
    const creds = getWaCreds(store);
    if (!conv || !creds)
        return { ok: false, message: "اربط واتساب أولاً" };
    const sent = await sendText(creds, conv.customer.waId, text);
    if (!sent)
        return { ok: false, message: "تعذّر الإرسال. غالباً انتهت نافذة 24 ساعة منذ آخر رسالة من العميل." };
    await logMessage(conv.id, "OUT", text, "TEXT", undefined, "STAFF");
    if (conv.status !== "STAFF_ACTIVE")
        await staffConnected(conv.id);
    revalidatePath(`/dashboard/conversations/${id}`);
    return { ok: true, message: "تم الإرسال" };
}
export async function manageStaffCartAction(_, fd) {
    const store = await getStore();
    const conversationId = String(fd.get("id") ?? "");
    const productId = String(fd.get("productId") ?? "");
    const operation = String(fd.get("operation") ?? "");
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, storeId: store.id }, select: { id: true, status: true } });
    if (!conv || conv.status === "CLOSED")
        return { ok: false, message: "المحادثة غير متاحة" };
    if (operation === "add") {
        const quantity = Number(fd.get("quantity"));
        if (!Number.isSafeInteger(quantity) || quantity < 1)
            return { ok: false, message: "أدخل كمية صحيحة" };
        const result = await addToCart(store.id, conversationId, productId, quantity);
        if (!result.ok)
            return { ok: false, message: result.error };
    }
    else if (operation === "set" || operation === "remove") {
        const quantity = operation === "remove" ? 0 : Number(fd.get("quantity"));
        if (!Number.isSafeInteger(quantity) || quantity < 0)
            return { ok: false, message: "أدخل كمية صحيحة" };
        const result = await setCartItemQuantity(store.id, conversationId, productId, quantity);
        if (!result.ok)
            return { ok: false, message: result.error };
    }
    else
        return { ok: false, message: "إجراء غير صالح" };
    revalidatePath(`/dashboard/conversations/${conversationId}`);
    return { ok: true, message: "تم تحديث السلة" };
}
export async function sendStaffCartPaymentAction(_, fd) {
    const store = await getStore();
    const conversationId = String(fd.get("id") ?? "");
    const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, storeId: store.id, status: { in: ["HANDOFF", "STAFF_ACTIVE"] } },
        include: { customer: true },
    });
    if (!conv)
        return { ok: false, message: "تولَّ المحادثة أولاً قبل إرسال الطلب للعميل" };
    if (!store.moyasarSecretKey)
        return { ok: false, message: "فعّل بوابة Moyasar من الإعدادات أولاً لإنشاء رابط الدفع" };
    const creds = getWaCreds(store);
    if (!creds)
        return { ok: false, message: "اربط واتساب أولاً" };
    const cart = await getCart(conversationId);
    let order;
    if (cart?.items.length) {
        const result = await createOrderWithInvoice(store.id, conversationId, conv.customerId, null);
        if (!result.ok)
            return { ok: false, message: result.error };
        order = await prisma.order.findFirst({
            where: { id: result.orderId, storeId: store.id },
            include: { items: { include: { product: true } } },
        });
        if (!order)
            return { ok: false, message: "تعذّر تحميل تفاصيل الطلب بعد إنشائه" };
        if (!result.paymentUrl) {
            return { ok: false, message: `تم إنشاء الطلب #${result.label}، لكن تعذّر إنشاء رابط الدفع (${result.paymentError ?? "خطأ غير معروف"}). اضغط الإرسال مرة أخرى لإعادة المحاولة.` };
        }
    }
    else {
        order = await prisma.order.findFirst({
            where: { storeId: store.id, conversationId, status: "PENDING" },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
        });
        if (!order)
            return { ok: false, message: "أضف المنتجات المطلوبة إلى السلة أولاً" };
        const payment = await createPaymentLinkForOrder(store.id, order.id);
        if (!payment.ok)
            return { ok: false, message: `تعذّر إنشاء رابط الدفع: ${payment.error}` };
        order.paymentUrl = payment.paymentUrl;
    }
    const label = order.id.slice(-6).toUpperCase();
    const sent = await sendPaymentLink({
        creds, to: conv.customer.waId, conversationId,
    }, label, order.totalHalalas, order.paymentUrl, order.items);
    if (!sent)
        return { ok: false, message: `تعذّر إرسال الطلب #${label} عبر واتساب. الرابط محفوظ: ${order.paymentUrl}` };
    if (conv.status !== "STAFF_ACTIVE")
        await staffConnected(conv.id);
    revalidatePath(`/dashboard/conversations/${conversationId}`);
    revalidatePath("/dashboard/orders");
    return { ok: true, message: `تم إرسال تفاصيل الطلب #${label} والإجمالي ورابط الدفع` };
}
export async function createTemplateAction(_) {
    const store = await getStore();
    const creds = getWaCreds(store);
    if (!store.waBusinessId || !creds)
        return { ok: false, message: "احفظ WhatsApp Business Account ID والتوكن أولاً" };
    if (!rateLimit(`tpl:${store.id}`, 5, 60_000).ok)
        return { ok: false, message: "محاولات كثيرة، انتظر دقيقة" };
    const r = await createFollowUpTemplate(store.waBusinessId, creds.accessToken);
    revalidatePath("/dashboard/whatsapp");
    return r;
}
/** "أطلق حملة المتابعة": sends the APPROVED template to each abandoned chat, once per chat. */
export async function launchFollowUpAction(_) {
    const store = await getStore();
    const creds = getWaCreds(store);
    if (!creds || !store.waBusinessId)
        return { ok: false, message: "اربط واتساب أولاً" };
    const status = await getTemplateStatus(store.waBusinessId, creds.accessToken);
    if (status !== "APPROVED")
        return { ok: false, message: status ? `قالب cart_followup حالته ${status}. لازم يكون APPROVED.` : "قالب cart_followup غير موجود. أنشئه من صفحة واتساب." };
    const convs = await prisma.conversation.findMany({ where: abandonedWhere(store.id), include: { customer: true }, take: 500 });
    let sent = 0;
    for (const c of convs) {
        if (await sendFollowUpTemplate(creds, c.customer.waId, c.customer.name ?? "")) {
            await prisma.conversation.update({ where: { id: c.id }, data: { followUpSent: true } });
            sent++;
        }
    }
    revalidatePath("/dashboard");
    return { ok: true, message: `تم إرسال ${sent} من ${convs.length} رسالة متابعة` };
}
/** "Test AI" button: runs a real request and shows the exact error (wrong key, wrong model, quota...) right in the dashboard. */
export async function testAiAction(_) {
    const store = await getStore();
    if (!rateLimit(`aitest:${store.id}`, 6, 60_000).ok)
        return { ok: false, message: "انتظر دقيقة قبل المحاولة مرة أخرى" };
    const r = await pingAi();
    await prisma.store.update({ where: { id: store.id }, data: r.ok ? { lastAiError: null, lastAiErrorAt: null } : { lastAiError: r.message, lastAiErrorAt: new Date() } });
    revalidatePath("/dashboard/whatsapp");
    return r;
}
