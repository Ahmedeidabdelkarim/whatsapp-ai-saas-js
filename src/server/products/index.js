import { prisma } from "@/lib/db/prisma";
import { canAddProduct } from "@/lib/billing/limits";
import { cosineSimilarity, createEmbedding, createEmbeddings, productEmbeddingText } from "@/lib/ai/embeddings";
export const listProducts = (storeId) => prisma.product.findMany({ where: { storeId }, include: { category: { include: { parent: true } }, brand: true }, orderBy: { createdAt: "desc" } });
/** Search is tenant-scoped and applies availability, category, brand, and price filters before ranking. */
export async function searchProducts(storeId, i) {
    const words = (i.q ?? "").split(/\s+/).filter((w) => w.length >= 2);
    const price = i.minHalalas != null || i.maxHalalas != null ? { priceHalalas: { ...(i.minHalalas != null ? { gte: i.minHalalas } : {}), ...(i.maxHalalas != null ? { lte: i.maxHalalas } : {}) } } : {};
    const filters = {
        storeId, active: true, stock: { gt: 0 }, ...price,
        ...(i.categoryId ? { OR: [{ categoryId: i.categoryId }, { category: { parentId: i.categoryId } }] } : {}),
        ...(i.brand ? { brand: { name: { contains: i.brand, mode: "insensitive" } } } : {}),
    };
    const include = { category: { include: { parent: true } }, brand: true };
    const textWhere = words.length ? { ...filters, AND: [{ OR: words.flatMap((w) => [
        { name: { contains: w, mode: "insensitive" } }, { description: { contains: w, mode: "insensitive" } },
        { brand: { name: { contains: w, mode: "insensitive" } } }, { category: { name: { contains: w, mode: "insensitive" } } },
    ]) }] } : filters;
    const textMatches = await prisma.product.findMany({ where: textWhere, include, orderBy: { priceHalalas: "asc" }, take: 8 });
    if (!words.length)
        return textMatches;
    let queryVector;
    try {
        queryVector = await createEmbedding(i.q);
    }
    catch (e) {
        console.warn("[ai] semantic product search failed; returning text matches:", e instanceof Error ? e.message : String(e));
        return textMatches;
    }
    if (!queryVector)
        return textMatches;
    const candidates = await prisma.product.findMany({ where: filters, include, orderBy: { createdAt: "desc" }, take: 1000 });
    if (!candidates.length)
        return [];
    const embeddings = await prisma.productEmbedding.findMany({
        where: { storeId, productId: { in: candidates.map((p) => p.id) } },
        select: { productId: true, vector: true },
    });
    const vectors = new Map(embeddings.map((entry) => [entry.productId, entry.vector]));
    const existingIds = new Set(embeddings.map((entry) => entry.productId));
    const toIndex = candidates.filter((product) => !existingIds.has(product.id)).slice(0, 40);
    if (toIndex.length) {
        try {
            const newVectors = await createEmbeddings(toIndex.map(productEmbeddingText));
            if (newVectors) {
                await prisma.productEmbedding.createMany({
                    data: toIndex.map((product, index) => ({ productId: product.id, storeId, vector: newVectors[index] })),
                    skipDuplicates: true,
                });
                for (let i = 0; i < toIndex.length; i++)
                    vectors.set(toIndex[i].id, newVectors[i]);
            }
        }
        catch (e) {
            console.warn("[ai] legacy product embedding backfill failed:", e instanceof Error ? e.message : String(e));
        }
    }
    const lexicalScore = (product) => {
        const fields = [product.name, product.description, product.brand?.name, product.category?.name, product.category?.parent?.name]
            .filter(Boolean).map((field) => field.toLocaleLowerCase());
        const matched = words.filter((word) => fields.some((field) => field.includes(word.toLocaleLowerCase()))).length;
        return matched / words.length;
    };
    const ranked = candidates.map((product) => {
        const similarity = cosineSimilarity(queryVector, vectors.get(product.id));
        const textScore = lexicalScore(product);
        return { product, similarity, score: similarity == null ? textScore * 0.35 : (similarity + 1) * 0.4 + textScore * 0.2 };
    }).filter((entry) => entry.similarity == null ? entry.score > 0 : entry.similarity >= 0.25 || lexicalScore(entry.product) > 0);
    return [...ranked.map((entry) => entry), ...textMatches.filter((product) => !ranked.some((entry) => entry.product.id === product.id)).map((product) => ({ product, score: lexicalScore(product) * 0.35 }))]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ product }) => product);
}

async function updateProductEmbedding(storeId, product) {
    try {
        const vector = await createEmbedding(productEmbeddingText(product));
        if (vector)
            await prisma.productEmbedding.upsert({
                where: { productId: product.id },
                create: { productId: product.id, storeId, vector },
                update: { storeId, vector },
            });
    }
    catch (e) {
        console.warn(`[ai] failed to index product ${product.id} for semantic search:`, e instanceof Error ? e.message : String(e));
    }
}

export async function createProduct(storeId, d) {
    if (!(await canAddProduct(storeId)))
        throw new Error("PLAN_LIMIT");
    const product = await prisma.product.create({
        data: { storeId, ...d },
        include: { category: { include: { parent: true } }, brand: true },
    });
    await updateProductEmbedding(storeId, product);
    return product;
}
export const updateStock = (storeId, id, stock) => prisma.product.updateMany({ where: { id, storeId }, data: { stock } });
export async function deleteProduct(storeId, id) {
    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({ where: { id, storeId }, select: { id: true, name: true } });
        if (!product)
            return { count: 0 };
        await tx.orderItem.updateMany({
            where: { productId: product.id },
            data: { productName: product.name },
        });
        await tx.cartItem.deleteMany({ where: { productId: product.id } });
        return tx.product.deleteMany({ where: { id: product.id, storeId } });
    });
}
export const listCategories = (storeId) => prisma.category.findMany({ where: { storeId }, include: { parent: true, _count: { select: { products: true } } }, orderBy: { name: "asc" } });
export const topLevelCategories = (storeId) => prisma.category.findMany({ where: { storeId, parentId: null } });
export const getProduct = (storeId, id) => prisma.product.findFirst({ where: { id, storeId }, include: { category: true, brand: true } });
export async function updateProduct(storeId, id, d) {
    const result = await prisma.product.updateMany({ where: { id, storeId }, data: d });
    if (result.count) {
        const product = await prisma.product.findFirst({ where: { id, storeId }, include: { category: { include: { parent: true } }, brand: true } });
        if (product)
            await updateProductEmbedding(storeId, product);
    }
    return result;
}
export async function findOrCreateBrand(storeId, name) {
    const n = name.trim();
    return (await prisma.brand.findFirst({ where: { storeId, name: n } })) ?? prisma.brand.create({ data: { storeId, name: n } });
}
