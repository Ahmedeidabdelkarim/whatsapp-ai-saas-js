"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

export async function updateStoreAction(fd) {
    await requireAdmin();
    const parsed = z.object({
        id: z.string().min(1),
        name: z.string().trim().min(2).max(100),
        slug: z.string().trim().min(2).max(80).regex(/^[\w\u0600-\u06FF-]+$/),
        isActive: z.boolean(),
    }).safeParse({
        id: fd.get("id"),
        name: fd.get("name"),
        slug: fd.get("slug"),
        isActive: fd.get("isActive") === "on",
    });
    if (!parsed.success)
        throw new Error("بيانات المتجر غير صحيحة");
    const { id, ...data } = parsed.data;
    await prisma.store.update({ where: { id }, data });
    revalidatePath("/admin/stores");
    revalidatePath("/admin/analytics");
}

const planSchema = z.object({
    name: z.string().trim().min(2).max(80),
    price: z.coerce.number().finite().min(0).max(1_000_000),
    maxProducts: z.coerce.number().int().positive().max(1_000_000),
    maxConversationsPerMonth: z.coerce.number().int().positive().max(10_000_000),
    aiSessionTokens: z.coerce.number().int().positive().max(1_000_000),
    voiceSupport: z.boolean(),
    crmFull: z.boolean(),
});

function getPlanFields(fd) {
    return {
        name: fd.get("name"),
        price: fd.get("price"),
        maxProducts: fd.get("maxProducts"),
        maxConversationsPerMonth: fd.get("maxConversationsPerMonth"),
        aiSessionTokens: fd.get("aiSessionTokens"),
        voiceSupport: fd.get("voiceSupport") === "on",
        crmFull: fd.get("crmFull") === "on",
    };
}

function planRecord(data) {
    const { price, ...features } = data;
    return { ...features, priceHalalas: Math.round(price * 100) };
}

export async function createPlanAction(fd) {
    await requireAdmin();
    const key = z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/).safeParse(fd.get("key"));
    const fields = planSchema.safeParse(getPlanFields(fd));
    if (!key.success || !fields.success)
        throw new Error("بيانات الباقة غير صحيحة");
    await prisma.plan.create({ data: { key: key.data, ...planRecord(fields.data) } });
    revalidatePath("/admin/settings");
}

export async function updatePlanAction(fd) {
    await requireAdmin();
    const id = z.string().min(1).safeParse(fd.get("id"));
    const fields = planSchema.safeParse(getPlanFields(fd));
    if (!id.success || !fields.success)
        throw new Error("بيانات الباقة غير صحيحة");
    await prisma.plan.update({ where: { id: id.data }, data: planRecord(fields.data) });
    revalidatePath("/admin/settings");
}
