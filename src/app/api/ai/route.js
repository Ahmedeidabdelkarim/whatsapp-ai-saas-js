import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/auth";
import { isStoreActive } from "@/lib/tenant/store-status";
const schema = z.object({ aiPersona: z.string().min(5).max(2000).optional(), greeting: z.string().min(2).max(500).optional(), aiEnabled: z.boolean().optional() });
export async function PATCH(req) {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await isStoreActive(s.storeId)))
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });
    const p = schema.safeParse(await req.json());
    if (!p.success)
        return NextResponse.json({ error: p.error.flatten() }, { status: 400 });
    return NextResponse.json(await prisma.store.update({ where: { id: s.storeId }, data: p.data, select: { aiPersona: true, greeting: true, aiEnabled: true } }));
}
