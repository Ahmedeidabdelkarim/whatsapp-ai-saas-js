import { prisma } from "@/lib/db/prisma";

export async function isStoreActive(storeId) {
    const store = await prisma.store.findFirst({ where: { id: storeId, isActive: true }, select: { id: true } });
    return !!store;
}
