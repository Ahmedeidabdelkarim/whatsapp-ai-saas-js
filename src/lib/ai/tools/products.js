import { prisma } from "@/lib/db/prisma";
import { searchProducts } from "@/server/products";
import { sar } from "@/lib/utils/format";
import { sendProductCard, sendText } from "@/lib/whatsapp/messages";
import { logMessage } from "@/server/conversations";
import { recordEvent } from "@/server/events";
export const listCategoriesTool = {
    def: {
        name: "list_categories",
        description: "اعرض أقسام المتجر (الرئيسية والفرعية) والماركات المتوفرة. استخدمها لتحويل كلام العميل (رجالي، نسائي...) إلى category_id.",
        input_schema: { type: "object", properties: {}, required: [] },
    },
    async run(ctx) {
        const [cats, brands] = await Promise.all([
            prisma.category.findMany({ where: { storeId: ctx.storeId }, include: { parent: true } }),
            prisma.brand.findMany({ where: { storeId: ctx.storeId } }),
        ]);
        return { categories: cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name ?? null })), brands: brands.map((b) => b.name) };
    },
};
export const searchProductsTool = {
    def: {
        name: "search_products",
        description: "ابحث في كتالوج المتجر. كل المعاملات اختيارية: query (كلمات من الاسم/الوصف/الماركة)، category_id، brand (اسم الماركة)، max_price/min_price بالريال. هذا المصدر الوحيد للمنتجات والأسعار.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string" }, category_id: { type: "string" }, brand: { type: "string" },
                max_price: { type: "number", description: "الحد الأعلى للسعر بالريال" }, min_price: { type: "number", description: "الحد الأدنى للسعر بالريال" },
            },
            required: [],
        },
    },
    async run(ctx, input) {
        const items = await searchProducts(ctx.storeId, {
            q: String(input.query ?? ""), categoryId: input.category_id ? String(input.category_id) : undefined, brand: input.brand ? String(input.brand) : undefined,
            minHalalas: input.min_price != null ? Math.round(Number(input.min_price) * 100) : undefined,
            maxHalalas: input.max_price != null ? Math.round(Number(input.max_price) * 100) : undefined,
        });
        if (items.length)
            await prisma.productInquiry.createMany({ data: items.slice(0, 3).map((p) => ({ productId: p.id, conversationId: ctx.conversationId })) });
        return items.map((p) => ({ id: p.id, name: p.name, price: sar(p.priceHalalas), in_stock: p.stock > 0, stock: p.stock, category: p.category?.name, brand: p.brand?.name }));
    },
};
export const showProductCardTool = {
    def: {
        name: "show_product_card",
        description: "أرسل للعميل بطاقة المنتج (صورة + اسم + سعر + توفّر) على واتساب.",
        input_schema: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] },
    },
    async run(ctx, input) {
        const p = await prisma.product.findFirst({ where: { id: String(input.product_id), storeId: ctx.storeId, active: true } });
        if (!p)
            return { error: "not_found" };
        await sendProductCard(ctx.creds, ctx.customerWaId, { name: p.name, price: sar(p.priceHalalas), inStock: p.stock > 0, imageUrl: p.imageUrl });
        await logMessage(ctx.conversationId, "OUT", `[بطاقة منتج] ${p.name} — ${sar(p.priceHalalas)}`, "IMAGE");
        await recordEvent({ conversationId: ctx.conversationId, type: "INTEREST", productId: p.id });
        if (p.stock > 0) {
            const question = "كم قطعة تحتاج؟ اكتب العدد بالأرقام العربية أو الإنجليزية، مثل ٢ أو 2.";
            await prisma.conversation.update({ where: { id: ctx.conversationId }, data: { awaiting: `QUANTITY:${p.id}` } });
            await sendText(ctx.creds, ctx.customerWaId, question);
            await logMessage(ctx.conversationId, "OUT", question);
            return { sent: true, awaitingCustomerInput: true };
        }
        return { sent: true };
    },
};
