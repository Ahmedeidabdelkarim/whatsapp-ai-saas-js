import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/utils/secret";
import { cleanup, drain } from "@/server/jobs/queue";
/** For cron (Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically). */
async function handler(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret)
        return new NextResponse("CRON_SECRET not set", { status: 503 });
    if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`))
        return new NextResponse("Unauthorized", { status: 401 });
    await drain();
    await cleanup();
    return NextResponse.json({ ok: true });
}
export const GET = handler;
export const POST = handler;
