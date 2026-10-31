"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getStore } from "@/lib/tenant/get-tenant";
import { createProduct, deleteProduct, findOrCreateBrand, updateProduct, updateStock } from ".";
export async function addProductAction(fd) {
    const store = await getStore();
    const p = z.object({ name: z.string().min(2), description: z.string().max(5000).optional(), price: z.coerce.number().positive(), stock: z.coerce.number().int().min(0), categoryId: z.string().optional(), brandName: z.string().optional(), imageUrl: z.string().url().optional().or(z.literal("")) }).parse(Object.fromEntries(fd));
    let brandId;
    if (p.brandName?.trim()) {
        const b = (await prisma.brand.findFirst({ where: { storeId: store.id, name: p.brandName.trim() } })) ?? (await prisma.brand.create({ data: { storeId: store.id, name: p.brandName.trim() } }));
        brandId = b.id;
    }
    await createProduct(store.id, { name: p.name, description: p.description?.trim() || null, priceHalalas: Math.round(p.price * 100), stock: p.stock, categoryId: p.categoryId || undefined, brandId, imageUrl: p.imageUrl || undefined });
    revalidatePath("/dashboard/products");
}
export async function setStockAction(fd) {
    const store = await getStore();
    await updateStock(store.id, String(fd.get("id")), Math.max(0, Number(fd.get("stock"))));
    revalidatePath("/dashboard/products");
}
export async function deleteProductAction(fd) {
    const store = await getStore();
    await deleteProduct(store.id, String(fd.get("id")));
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/orders");
}
export async function addCategoryAction(fd) {
    const store = await getStore();
    const name = String(fd.get("name") ?? "").trim();
    const parentId = String(fd.get("parentId") ?? "") || null;
    if (name)
        await prisma.category.create({ data: { storeId: store.id, name, parentId } });
    revalidatePath("/dashboard/categories");
}
export async function updateProductAction(_previousState, fd) {
    const store = await getStore();
    const parsed = z.object({ id: z.string(), name: z.string().min(2), description: z.string().max(5000).optional(), price: z.coerce.number().positive(), stock: z.coerce.number().int().min(0), categoryId: z.string().optional(), brandName: z.string().optional(), imageUrl: z.string().url().optional().or(z.literal("")) }).safeParse(Object.fromEntries(fd));
    if (!parsed.success)
        return { ok: false, message: "تحقق من البيانات المدخلة وحاول مرة أخرى." };
    const p = parsed.data;
    const brand = p.brandName?.trim() ? await findOrCreateBrand(store.id, p.brandName) : null;
    const result = await updateProduct(store.id, p.id, {
        name: p.name, description: p.description?.trim() || null, priceHalalas: Math.round(p.price * 100), stock: p.stock,
        categoryId: p.categoryId || null, brandId: brand?.id ?? null, ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
    });
    if (!result.count)
        return { ok: false, message: "لم يتم العثور على المنتج؛ حدّث الصفحة وحاول مرة أخرى." };
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${p.id}`);
    return { ok: true, message: "تم تعديل المنتج بنجاح." };
}
