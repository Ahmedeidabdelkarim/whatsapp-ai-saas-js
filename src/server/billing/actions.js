"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getStore } from "@/lib/tenant/get-tenant";
import { createInvoice, paymentCallbackUrl } from "@/lib/billing/moyasar";
import { rateLimit } from "@/lib/utils/rate-limit";
/** Merchant buys/changes a plan: create a Moyasar invoice with the PLATFORM key, remember it, send them to checkout. */
export async function checkoutPlanAction(fd) {
    const store = await getStore();
    const key = process.env.MOYASAR_SECRET_KEY;
    if (!key)
        redirect("/dashboard/billing?error=gateway");
    if (!rateLimit(`checkout:${store.id}`, 6, 60_000).ok)
        redirect("/dashboard/billing?error=rate");
    const plan = await prisma.plan.findUnique({ where: { key: String(fd.get("plan")) } });
    const sub = await prisma.subscription.findUnique({ where: { storeId: store.id } });
    if (!plan || !sub || plan.priceHalalas <= 0)
        redirect("/dashboard/billing?error=plan");
    let url = null;
    try {
        const inv = await createInvoice(key, {
            amountHalalas: plan.priceHalalas, description: `اشتراك ${plan.name} - ${store.name}`,
            callbackUrl: paymentCallbackUrl(), successUrl: `${process.env.APP_URL}/dashboard/billing?paid=1`, backUrl: `${process.env.APP_URL}/dashboard/billing`,
        });
        await prisma.payment.create({ data: { subscriptionId: sub.id, planId: plan.id, amountHalalas: plan.priceHalalas, gatewayRef: inv.id, status: "pending" } });
        url = inv.url;
    }
    catch (e) {
        console.error("[pay] checkout failed:", e.message);
        redirect("/dashboard/billing?error=gateway");
    }
    if (!url)
        redirect("/dashboard/billing?error=gateway");
    redirect(url);
}
