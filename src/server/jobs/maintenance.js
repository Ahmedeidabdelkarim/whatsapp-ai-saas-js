import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/server/events";
/** In a cart (or checkout) and silent for 24h -> stage ABANDONED + event. Runs every minute from the worker. */
export async function markAbandoned() {
    const stale = await prisma.conversation.findMany({
        where: { status: "ACTIVE", stage: { in: ["IN_CART", "CHECKOUT"] }, lastMessageAt: { lt: new Date(Date.now() - 864e5) }, cart: { is: { items: { some: {} } } } },
        select: { id: true }, take: 200,
    });
    for (const c of stale)
        await recordEvent({ conversationId: c.id, type: "ABANDONED" });
    return stale.length;
}
