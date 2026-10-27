import { z } from "zod";
export const productSchema = z.object({ name: z.string().min(2), priceHalalas: z.number().int().positive(), stock: z.number().int().min(0) });
