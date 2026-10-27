import { headers } from "next/headers";
/** Behind a proxy (Vercel, nginx, ngrok) the client IP is the first x-forwarded-for entry. */
export async function clientIp() {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
