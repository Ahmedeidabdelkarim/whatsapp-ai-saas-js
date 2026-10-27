import { prisma } from "@/lib/db/prisma";
export const checkInventoryTool = {
    def: {
        name: "check_inventory",
        description: "تحقق من المخزون الحالي لمنتج قبل تأكيد الكمية.",
        input_schema: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] },
    },
    async run(ctx, input) {
        const p = await prisma.product.findFirst({ where: { id: String(input.product_id), storeId: ctx.storeId }, select: { name: true, stock: true } });
        return p ?? { error: "not_found" };
    },
};
