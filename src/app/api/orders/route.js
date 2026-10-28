import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { isStoreActive } from "@/lib/tenant/store-status";
import { listOrders } from "@/server/orders";
export async function GET() {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await isStoreActive(s.storeId)))
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });
    return NextResponse.json(await listOrders(s.storeId));
}
