import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/auth";
import { isStoreActive } from "@/lib/tenant/store-status";
import { deleteFile, saveFile } from "@/lib/storage";
import { isKind, sniffMatches, validateUpload } from "@/lib/storage/validate";

export const runtime = "nodejs";

async function getActiveStoreId() {
    const session = await getSession();
    if (!session?.storeId)
        return null;
    return await isStoreActive(session.storeId) ? session.storeId : false;
}

export async function POST(req) {
    const storeId = await getActiveStoreId();
    if (storeId === null)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (storeId === false)
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });

    let form;
    try {
        form = await req.formData();
    }
    catch {
        return NextResponse.json({ error: "تعذر قراءة الملف المرفق" }, { status: 400 });
    }
    const kind = String(form.get("kind") ?? "");
    const productId = String(form.get("productId") ?? "");
    const file = form.get("file");
    if (!isKind(kind) || !file || typeof file.arrayBuffer !== "function")
        return NextResponse.json({ error: "نوع الملف أو الملف المرفق غير صالح" }, { status: 400 });
    if (productId && kind !== "IMAGE")
        return NextResponse.json({ error: "صورة المنتج يجب أن تكون من نوع IMAGE" }, { status: 400 });

    let product = null;
    if (productId) {
        product = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true, imageUrl: true } });
        if (!product)
            return NextResponse.json({ error: "المنتج غير موجود في متجرك" }, { status: 404 });
    }
    const validation = validateUpload(kind, file.type, file.size);
    if (!validation.ok)
        return NextResponse.json({ error: validation.error }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!sniffMatches(validation.ext, buffer))
        return NextResponse.json({ error: "محتوى الملف لا يطابق صيغته" }, { status: 400 });

    let url;
    try {
        url = await saveFile(storeId, validation.ext, buffer);
    }
    catch (e) {
        console.error("[uploads] storage write failed:", e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: "تعذر حفظ الملف في التخزين. راجع إعدادات AWS S3 وصلاحياته." }, { status: 502 });
    }
    try {
        if (product) {
            const result = await prisma.product.updateMany({ where: { id: product.id, storeId }, data: { imageUrl: url } });
            if (!result.count)
                throw new Error("المنتج لم يعد متاحًا");
            if (product.imageUrl)
                await deleteFile(product.imageUrl);
        }
        else {
            const previous = await prisma.welcomeAsset.findUnique({ where: { storeId_kind: { storeId, kind } }, select: { url: true } });
            await prisma.welcomeAsset.upsert({
                where: { storeId_kind: { storeId, kind } },
                create: { storeId, kind, url },
                update: { url, enabled: true },
            });
            if (previous?.url)
                await deleteFile(previous.url);
        }
    }
    catch (e) {
        await deleteFile(url);
        throw e;
    }
    return NextResponse.json({ ok: true, url });
}

export async function DELETE(req) {
    const storeId = await getActiveStoreId();
    if (storeId === null)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (storeId === false)
        return NextResponse.json({ error: "store_disabled" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") ?? "";
    const productId = searchParams.get("productId") ?? "";
    if (!isKind(kind))
        return NextResponse.json({ error: "نوع الملف غير صالح" }, { status: 400 });
    if (productId) {
        if (kind !== "IMAGE")
            return NextResponse.json({ error: "صورة المنتج يجب أن تكون من نوع IMAGE" }, { status: 400 });
        const product = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true, imageUrl: true } });
        if (!product)
            return NextResponse.json({ error: "المنتج غير موجود في متجرك" }, { status: 404 });
        await prisma.product.updateMany({ where: { id: productId, storeId }, data: { imageUrl: null } });
        if (product.imageUrl)
            await deleteFile(product.imageUrl);
        return NextResponse.json({ ok: true });
    }
    const asset = await prisma.welcomeAsset.findUnique({ where: { storeId_kind: { storeId, kind } } });
    if (asset) {
        await prisma.welcomeAsset.delete({ where: { id: asset.id } });
        await deleteFile(asset.url);
    }
    return NextResponse.json({ ok: true });
}
