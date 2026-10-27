// Default import + destructuring: works in plain Node ESM (named imports from this CJS package can fail there).
import prismaPkg from "@prisma/client";
import bcrypt from "bcryptjs";
const { PrismaClient } = prismaPkg;
const db = new PrismaClient();
async function main() {
    const plans = [
        // trial gets everything so you can test every feature
        { key: "trial", name: "تجريبية", priceHalalas: 0, maxProducts: 20, maxConversationsPerMonth: 100, aiSessionTokens: 4000, voiceSupport: true, crmFull: true },
        // keys kept from v1 so existing subscriptions stay valid. Limits follow the product spec; prices are placeholders.
        { key: "starter", name: "Basic", priceHalalas: 14900, maxProducts: 50, maxConversationsPerMonth: 500, aiSessionTokens: 1200, voiceSupport: false, crmFull: false },
        { key: "growth", name: "Standard", priceHalalas: 39900, maxProducts: 250, maxConversationsPerMonth: 2500, aiSessionTokens: 4000, voiceSupport: true, crmFull: false },
        { key: "pro", name: "Diamond", priceHalalas: 99900, maxProducts: 1_000_000, maxConversationsPerMonth: 20000, aiSessionTokens: 12000, voiceSupport: true, crmFull: true },
    ];
    for (const p of plans)
        await db.plan.upsert({ where: { key: p.key }, update: p, create: p });
    const trial = await db.plan.findUniqueOrThrow({ where: { key: "trial" } });
    await db.user.upsert({
        where: { email: "admin@example.com" }, update: {},
        create: { email: "admin@example.com", name: "Super Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash("admin12345", 10) },
    });
    const store = await db.store.upsert({
        where: { slug: "abaq" }, update: {},
        create: { name: "متجر عبق للعطور", slug: "abaq", greeting: "وعليكم السلام! أهلاً بك في متجر عبق، هذي جولة سريعة تعرّفك علينا" },
    });
    await db.user.upsert({
        where: { email: "owner@abaq.test" }, update: {},
        create: { email: "owner@abaq.test", name: "صاحب المتجر", storeId: store.id, passwordHash: await bcrypt.hash("owner12345", 10) },
    });
    await db.subscription.upsert({
        where: { storeId: store.id }, update: {},
        create: { storeId: store.id, planId: trial.id, currentPeriodEnd: new Date(Date.now() + 14 * 864e5) },
    });
    const brand = (await db.brand.findFirst({ where: { storeId: store.id } })) ?? (await db.brand.create({ data: { storeId: store.id, name: "عبق" } }));
    const mk = async (name, parentId) => (await db.category.findFirst({ where: { storeId: store.id, name, parentId: parentId ?? null } })) ??
        db.category.create({ data: { storeId: store.id, name, parentId } });
    const perfumes = await mk("العطور");
    const oils = await mk("الزيوت");
    const incense = await mk("البخور");
    const men = await mk("رجالي", perfumes.id);
    const women = await mk("نسائي", perfumes.id);
    const unisex = await mk("للجنسين", perfumes.id);
    if ((await db.product.count({ where: { storeId: store.id } })) === 0) {
        const items = [
            ["عود ملكي 100 مل", 32000, 7, men.id], ["ورد طائفي 50 مل", 24000, 23, women.id],
            ["مسك أبيض 75 مل", 18000, 2, unisex.id], ["دهن عود كلاسيك 12 مل", 39000, 9, oils.id],
            ["بخور كمبودي فاخر", 45000, 12, incense.id],
        ];
        for (const [name, priceHalalas, stock, categoryId] of items)
            await db.product.create({ data: { storeId: store.id, name, priceHalalas, stock, categoryId, brandId: brand.id } });
    }
    console.log("Seeded. owner@abaq.test / owner12345  |  admin@example.com / admin12345");
}
main().finally(() => db.$disconnect());
