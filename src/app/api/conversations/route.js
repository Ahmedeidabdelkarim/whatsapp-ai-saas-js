import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { listConversations } from "@/server/conversations";
export async function GET() {
    const s = await getSession();
    if (!s?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json(await listConversations(s.storeId));
}
