import { prisma } from "@/lib/db/prisma";
/** Webhook side: resolve the tenant from the WhatsApp phone_number_id Meta sends. */
export const getStoreByPhoneNumberId = (id) => prisma.store.findFirst({ where: { waPhoneNumberId: id, isActive: true } });
