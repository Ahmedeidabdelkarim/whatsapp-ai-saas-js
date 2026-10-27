import { prisma } from "@/lib/db/prisma";
import { canAddProduct } from "@/lib/billing/limits";
export const listProducts = (storeId) => prisma.product.findMany({ where: { storeId }, include: { category: { include: { parent: true } }, brand: true }, orderBy: { createdAt: "desc" } });
/** Search used by the AI. Only active products of this store. Words in `q` match name, description, brand or category (any word). */
export function searchProducts(storeId, i) {
    const words = (i.q ?? "").split(/\s+/).filter((w) => w.length >= 2);
    const price = i.minHalalas != null || i.maxHalalas != null ? { priceHalalas: { ...(i.minHalalas != null ? { gte: i.minHalalas } : {}), ...(i.maxHalalas != null ? { lte: i.maxHalalas } : {}) } } : {};
    return prisma.product.findMany({
        where: {
            storeId, active: true, ...price,
            ...(i.categoryId ? { OR: [{ categoryId: i.categoryId }, { category: { parentId: i.categoryId } }] } : {}),
            ...(i.brand ? { brand: { name: { contains: i.brand, mode: "insensitive" } } } : {}),
            ...(words.length ? { AND: [{ OR: words.flatMap((w) => [
                            { name: { contains: w, mode: "insensitive" } }, { description: { contains: w, mode: "insensitive" } },
                            { brand: { name: { contains: w, mode: "insensitive" } } }, { category: { name: { contains: w, mode: "insensitive" } } }
                        ]) }] } : {}),
        },
        include: { category: true, brand: true }, orderBy: { priceHalalas: "asc" }, take: 8,
    });
}
export async function createProduct(storeId, d) {
    if (!(await canAddProduct(storeId)))
        throw new Error("PLAN_LIMIT");
    return prisma.product.create({ data: { storeId, ...d } });
}
export const updateStock = (storeId, id, stock) => prisma.product.updateMany({ where: { id, storeId }, data: { stock } });
export const deleteProduct = (storeId, id) => prisma.product.deleteMany({ where: { id, storeId } });
export const listCategories = (storeId) => prisma.category.findMany({ where: { storeId }, include: { parent: true, _count: { select: { products: true } } }, orderBy: { name: "asc" } });
export const topLevelCategories = (storeId) => prisma.category.findMany({ where: { storeId, parentId: null } });
export const getProduct = (storeId, id) => prisma.product.findFirst({ where: { id, storeId }, include: { category: true, brand: true } });
export async function updateProduct(storeId, id, d) {
    return prisma.product.updateMany({ where: { id, storeId }, data: d });
}
export async function findOrCreateBrand(storeId, name) {
    const n = name.trim();
    return (await prisma.brand.findFirst({ where: { storeId, name: n } })) ?? prisma.brand.create({ data: { storeId, name: n } });
}
