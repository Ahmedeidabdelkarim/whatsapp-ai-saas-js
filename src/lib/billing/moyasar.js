/** Minimal Moyasar Invoices client (https://docs.moyasar.com). Amounts are in halalas (smallest unit of SAR). */
const API = "https://api.moyasar.com/v1";
const auth = (secretKey) => "Basic " + Buffer.from(secretKey + ":").toString("base64");
async function call(secretKey, path, init) {
    const res = await fetch(API + path, {
        ...init,
        headers: { Authorization: auth(secretKey), "Content-Type": "application/json", ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({})));
    if (!res.ok)
        throw new Error(`Moyasar ${res.status}: ${json.message ?? "request failed"}`);
    return json;
}
export const createInvoice = (secretKey, i) => call(secretKey, "/invoices", {
    method: "POST",
    body: JSON.stringify({
        amount: i.amountHalalas, currency: "SAR", description: i.description,
        callback_url: i.callbackUrl, ...(i.successUrl ? { success_url: i.successUrl } : {}), ...(i.backUrl ? { back_url: i.backUrl } : {}),
    }),
});
/** The callback body is NOT trusted. We always re-fetch the invoice with our secret key and read its real status. */
export const fetchInvoice = (secretKey, id) => call(secretKey, `/invoices/${encodeURIComponent(id)}`);
export const paymentCallbackUrl = () => `${process.env.APP_URL}/api/webhooks/payments?s=${encodeURIComponent(process.env.PAYMENTS_WEBHOOK_SECRET ?? "")}`;
