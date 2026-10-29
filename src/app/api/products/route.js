import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth";
import { isStoreActive } from "@/lib/tenant/store-status";
import { createProduct, listProducts } from "@/server/products";
export async function GET() {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await isStoreActive(s.storeId)))
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });
    return NextResponse.json(await listProducts(s.storeId));
}
const schema = z.object({ name: z.string().min(2), description: z.string().max(5000).optional(), priceHalalas: z.number().int().positive(), stock: z.number().int().min(0), categoryId: z.string().optional(), brandId: z.string().optional(), imageUrl: z.string().url().optional() });
export async function POST(req) {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await isStoreActive(s.storeId)))
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });
    const p = schema.safeParse(await req.json());
    if (!p.success)
        return NextResponse.json({ error: p.error.flatten() }, { status: 400 });
    try {
        return NextResponse.json(await createProduct(s.storeId, p.data), { status: 201 });
    }
    catch (e) {
        return NextResponse.json({ error: e.message }, { status: e.message === "PLAN_LIMIT" ? 402 : 500 });
    }
}
