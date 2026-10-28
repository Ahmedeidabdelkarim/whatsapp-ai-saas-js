import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/permissions";
/** Dashboard side: the store of the logged-in user. Every query MUST filter by this storeId. */
export async function getStore() {
    const s = await requireUser();
    if (!s.storeId)
        redirect("/admin");
    const store = await prisma.store.findFirst({ where: { id: s.storeId, isActive: true } });
    if (!store)
        redirect("/login?storeDisabled=1");
    return store;
}
