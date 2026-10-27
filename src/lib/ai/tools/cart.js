import { addToCart, getCart, removeFromCart } from "@/server/carts";
import { sar } from "@/lib/utils/format";
export const addToCartTool = {
    def: {
        name: "add_to_cart",
        description: "أضف العدد الذي حدده العميل من المنتج للسلة بعد موافقته الصريحة.",
        input_schema: { type: "object", properties: { product_id: { type: "string" }, quantity: { type: "integer", minimum: 1 } }, required: ["product_id", "quantity"] },
    },
    run: (ctx, i) => {
        const quantity = Number(i.quantity);
        if (!Number.isInteger(quantity) || quantity < 1)
            return { ok: false, error: "يجب تحديد عدد صحيح من قطعة واحدة على الأقل" };
        return addToCart(ctx.storeId, ctx.conversationId, String(i.product_id), quantity);
    },
};
export const removeFromCartTool = {
    def: { name: "remove_from_cart", description: "احذف منتجاً من السلة.", input_schema: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] } },
    async run(ctx, i) { await removeFromCart(ctx.conversationId, String(i.product_id)); return { ok: true }; },
};
export const viewCartTool = {
    def: { name: "view_cart", description: "اعرض محتويات السلة والإجمالي.", input_schema: { type: "object", properties: {}, required: [] } },
    async run(ctx) {
        const cart = await getCart(ctx.conversationId);
        const lines = (cart?.items ?? []).map((i) => ({ name: i.product.name, qty: i.quantity, line_total: sar(i.quantity * i.product.priceHalalas) }));
        return { lines, total: sar((cart?.items ?? []).reduce((s, i) => s + i.quantity * i.product.priceHalalas, 0)) };
    },
};
