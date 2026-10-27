import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/utils/secret";
import { settleInvoice } from "@/server/billing/settle";
/**
 * Moyasar invoice callback (POST when an invoice is paid). We only use it as a "go check" signal:
 * the shared secret in ?s= filters random traffic, and settleInvoice() verifies the real status with Moyasar.
 */
export async function POST(req) {
    const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
    if (!secret || !safeEqual(req.nextUrl.searchParams.get("s") ?? "", secret))
        return new NextResponse("Unauthorized", { status: 401 });
    const body = await req.json().catch(() => null);
    const invoiceId = body?.invoice_id ?? body?.data?.invoice_id ?? body?.id;
    if (!invoiceId)
        return NextResponse.json({ ok: true, result: "ignored" });
    try {
        const result = await settleInvoice(invoiceId);
        console.log(`[pay] invoice ${invoiceId}: ${result}`);
        return NextResponse.json({ ok: true, result });
    }
    catch (e) {
        console.error(`[pay] settle failed for ${invoiceId}:`, e.message);
        return new NextResponse("Retry", { status: 500 }); // let Moyasar call again
    }
}
