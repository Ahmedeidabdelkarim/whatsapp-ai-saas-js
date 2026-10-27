import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/permissions";
/** Dashboard side: the store of the logged-in user. Every query MUST filter by this storeId. */
export async function getStore() {
    const s = await requireUser();
    if (!s.storeId)
        redirect("/admin");
    const store = await prisma.store.findUnique({ where: { id: s.storeId } });
    if (!store)
        redirect("/login");
    return store;
}
