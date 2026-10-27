import { NextResponse, after } from "next/server";
import { verifySignature } from "@/lib/whatsapp/client";
import { getStoreByPhoneNumberId } from "@/lib/tenant/tenant-context";
import { drain, enqueueMany } from "@/server/jobs/queue";
// Meta webhook verification handshake
export function GET(req) {
    const p = req.nextUrl.searchParams;
    if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN)
        return new NextResponse(p.get("hub.challenge"));
    return new NextResponse("Forbidden", { status: 403 });
}
/**
 * Does the minimum before answering Meta: verify signature, store one job per message, return 200.
 * The AI work happens in the queue worker, so slow Claude calls can never make Meta time out and retry.
 */
export async function POST(req) {
    const raw = await req.text();
    if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
        console.warn("[wa] webhook rejected: bad signature (check WHATSAPP_APP_SECRET)");
        return new NextResponse("Bad signature", { status: 401 });
    }
    let body;
    try {
        body = JSON.parse(raw);
    }
    catch {
        return new NextResponse("Bad JSON", { status: 400 });
    }
    const jobs = [];
    for (const entry of body.entry ?? [])
        for (const change of entry.changes ?? []) {
            const v = change.value;
            const phoneNumberId = v?.metadata?.phone_number_id;
            if (!phoneNumberId || !v.messages)
                continue; // delivery/read statuses are ignored
            const store = await getStoreByPhoneNumberId(phoneNumberId);
            if (!store) {
                console.warn(`[wa] message for unknown phone_number_id ${phoneNumberId}: save it in dashboard/whatsapp`);
                continue;
            }
            for (const message of v.messages) {
                const profileName = v.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
                jobs.push({ type: "wa_message", payload: { phoneNumberId, message, profileName }, storeId: store.id, groupKey: `${phoneNumberId}:${message.from}`, dedupeKey: `wa:${message.id}` });
            }
        }
    try {
        await enqueueMany(jobs);
    }
    catch (e) {
        console.error("[wa] enqueue failed", e);
        return new NextResponse("Retry", { status: 500 });
    } // Meta will redeliver
    if (jobs.length) {
        console.log(`[wa] queued ${jobs.length} message(s)`);
        after(() => drain().catch((e) => console.error("[jobs] drain error", e)));
    }
    return NextResponse.json({ ok: true });
}
