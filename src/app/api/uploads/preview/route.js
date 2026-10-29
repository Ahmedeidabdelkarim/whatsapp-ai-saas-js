import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { readFile } from "@/lib/storage";
import { isKind } from "@/lib/storage/validate";
import { isStoreActive } from "@/lib/tenant/store-status";

export const runtime = "nodejs";

export async function GET(req) {
    const session = await getSession();
    if (!session?.storeId)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await isStoreActive(session.storeId)))
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });

    const kind = new URL(req.url).searchParams.get("kind") ?? "";
    if (!isKind(kind))
        return NextResponse.json({ error: "نوع الملف غير صالح" }, { status: 400 });
    const asset = await prisma.welcomeAsset.findUnique({
        where: { storeId_kind: { storeId: session.storeId, kind } },
        select: { url: true },
    });
    if (!asset)
        return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

    try {
        const file = await readFile(session.storeId, asset.url);
        return new Response(new Uint8Array(file.body), {
            headers: {
                "Content-Type": file.contentType,
                "Content-Length": String(file.body.length),
                "Content-Disposition": "inline",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    }
    catch (e) {
        console.error("[uploads] preview failed:", e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: "تعذر تحميل الملف من التخزين" }, { status: 502 });
    }
}
