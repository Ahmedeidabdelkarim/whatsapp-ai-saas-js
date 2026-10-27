import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInvoice, fetchInvoice, paymentCallbackUrl } from "../src/lib/billing/moyasar";
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
function mockFetch(status, body) {
    const calls = [];
    globalThis.fetch = (async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify(body), { status });
    });
    return calls;
}
test("createInvoice posts halalas + SAR with basic auth and returns the checkout url", async () => {
    const calls = mockFetch(201, { id: "inv_1", status: "initiated", amount: 32000, currency: "SAR", url: "https://checkout.moyasar.com/invoices/inv_1" });
    const inv = await createInvoice("sk_test_abc", { amountHalalas: 32000, description: "طلب #A1", callbackUrl: "https://x.test/cb" });
    assert.equal(inv.url, "https://checkout.moyasar.com/invoices/inv_1");
    assert.equal(calls[0].url, "https://api.moyasar.com/v1/invoices");
    const h = calls[0].init.headers;
    assert.equal(h.Authorization, "Basic " + Buffer.from("sk_test_abc:").toString("base64"));
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual([body.amount, body.currency, body.callback_url], [32000, "SAR", "https://x.test/cb"]);
});
test("fetchInvoice reads the invoice by id", async () => {
    const calls = mockFetch(200, { id: "inv_1", status: "paid", amount: 100, currency: "SAR", url: "u" });
    assert.equal((await fetchInvoice("sk", "inv_1")).status, "paid");
    assert.equal(calls[0].url, "https://api.moyasar.com/v1/invoices/inv_1");
});
test("API errors surface a readable message", async () => {
    mockFetch(401, { message: "Invalid authorization credentials" });
    await assert.rejects(() => fetchInvoice("bad", "x"), /Moyasar 401: Invalid authorization credentials/);
});
test("callback url carries the shared secret", () => {
    process.env.APP_URL = "https://app.test";
    process.env.PAYMENTS_WEBHOOK_SECRET = "s3 cret";
    assert.equal(paymentCallbackUrl(), "https://app.test/api/webhooks/payments?s=s3%20cret");
});
