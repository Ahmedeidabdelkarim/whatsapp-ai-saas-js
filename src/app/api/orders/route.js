import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { listOrders } from "@/server/orders";
export async function GET() {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json(await listOrders(s.storeId));
}
