import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
process.env.WHATSAPP_APP_SECRET = "meta-secret";
import { verifySignature } from "../src/lib/whatsapp/client";
const sign = (raw) => "sha256=" + crypto.createHmac("sha256", "meta-secret").update(raw).digest("hex");
test("accepts a correct Meta signature", () => assert.ok(verifySignature('{"a":1}', sign('{"a":1}'))));
test("rejects tampered body, wrong signature and missing header", () => {
    assert.ok(!verifySignature('{"a":2}', sign('{"a":1}')));
    assert.ok(!verifySignature('{"a":1}', "sha256=deadbeef"));
    assert.ok(!verifySignature('{"a":1}', null));
});
