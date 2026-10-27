import { prisma } from "@/lib/db/prisma";
/** Applies a paid plan: switches to it and gives 30 days from now. */
export async function activatePlan(subscriptionId, planId) {
    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 864e5), ...(planId ? { planId } : {}) },
    });
}
