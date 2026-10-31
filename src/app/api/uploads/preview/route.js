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

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const kind = searchParams.get("kind") ?? "";
    if (!isKind(kind))
        return NextResponse.json({ error: "نوع الملف غير صالح" }, { status: 400 });
    let url;
    if (productId) {
        if (kind !== "IMAGE")
            return NextResponse.json({ error: "معاينة المنتج متاحة للصور فقط" }, { status: 400 });
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId: session.storeId },
            select: { imageUrl: true },
        });
        url = product?.imageUrl;
    }
    else {
        const asset = await prisma.welcomeAsset.findUnique({
            where: { storeId_kind: { storeId: session.storeId, kind } },
            select: { url: true },
        });
        url = asset?.url;
    }
    if (!url)
        return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

    try {
        const file = await readFile(session.storeId, url);
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
