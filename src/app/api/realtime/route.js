import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/auth";
import { subscribe } from "@/lib/realtime/bus";
import { SSE_PING, sseData } from "@/lib/realtime/sse";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Server-Sent Events stream for the logged-in store. Two sources feed it:
 *  1. the in-process bus (instant) when the message was handled by this server, and
 *  2. a 4s check of the newest conversation change in the DB (safety net if the worker runs in another process/instance).
 * Events carry no private data: they only say "something changed"; the page then re-reads its own data through normal auth.
 */
export async function GET(req) {
    const s = await getSession();
    if (!s?.storeId)
        return new Response("unauthorized", { status: 401 });
    const storeId = s.storeId;
    const enc = new TextEncoder();
    const signature = async () => {
        const c = await prisma.conversation.findFirst({ where: { storeId }, orderBy: { updatedAt: "desc" }, select: { id: true, updatedAt: true } });
        return c ? `${c.id}:${c.updatedAt.getTime()}` : "none";
    };
    let cleanup = () => { };
    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            const send = (chunk) => { if (!closed)
                try {
                    controller.enqueue(enc.encode(chunk));
                }
                catch { /* client went away */ } };
            let last = await signature().catch(() => "none");
            const unsub = subscribe(storeId, (e) => send(sseData(e)));
            const ping = setInterval(() => send(SSE_PING), 20_000);
            const poll = setInterval(async () => {
                const sig = await signature().catch(() => last);
                if (sig !== last) {
                    last = sig;
                    send(sseData({ type: "sync", at: Date.now() }));
                }
            }, 4_000);
            cleanup = () => { if (closed)
                return; closed = true; unsub(); clearInterval(ping); clearInterval(poll); try {
                controller.close();
            }
            catch { /* already closed */ } };
            req.signal.addEventListener("abort", cleanup);
            send(sseData({ type: "hello", at: Date.now() }));
        },
        cancel() { cleanup(); },
    });
    return new Response(stream, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
    });
}
