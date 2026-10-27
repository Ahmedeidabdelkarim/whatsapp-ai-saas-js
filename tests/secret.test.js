import { test } from "node:test";
import assert from "node:assert/strict";
process.env.AUTH_SECRET = "test-secret-for-unit-tests";
import { encryptSecret, decryptSecret, hashToken, safeEqual } from "../src/lib/utils/secret";
test("encrypt/decrypt round trip", () => {
    const enc = encryptSecret("EAAB-token-123");
    assert.ok(enc.startsWith("enc:v1:"));
    assert.notEqual(enc, "EAAB-token-123");
    assert.equal(decryptSecret(enc), "EAAB-token-123");
});
test("each encryption uses a fresh IV", () => {
    assert.notEqual(encryptSecret("same"), encryptSecret("same"));
});
test("legacy plaintext values pass through", () => {
    assert.equal(decryptSecret("plain-old-token"), "plain-old-token");
});
test("tampered ciphertext is rejected", () => {
    const enc = encryptSecret("secret");
    const bad = enc.slice(0, -4) + (enc.endsWith("AAAA") ? "BBBB" : "AAAA");
    assert.throws(() => decryptSecret(bad));
});
test("hashToken is deterministic and safeEqual compares correctly", () => {
    assert.equal(hashToken("abc"), hashToken("abc"));
    assert.notEqual(hashToken("abc"), hashToken("abd"));
    assert.ok(safeEqual("x", "x"));
    assert.ok(!safeEqual("x", "y"));
    assert.ok(!safeEqual("x", "xx"));
});
test("empty ENCRYPTION_KEY falls back to AUTH_SECRET (as in a fresh .env)", () => {
    process.env.ENCRYPTION_KEY = "";
    assert.equal(decryptSecret(encryptSecret("token")), "token");
    delete process.env.ENCRYPTION_KEY;
});
