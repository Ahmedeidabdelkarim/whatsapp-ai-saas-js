import { test } from "node:test";
import assert from "node:assert/strict";
process.env.AUTH_SECRET = "test-secret-for-otp";
import { generateOtp, hashOtp, checkOtp, normalizeOtpInput, isOtpUsable, MAX_ATTEMPTS, OTP_LENGTH } from "../src/lib/auth/otp";

test("codes are always 6 digits, including leading zeros", () => {
  for (let i = 0; i < 500; i++) assert.match(generateOtp(), /^\d{6}$/);
  assert.equal(OTP_LENGTH, 6);
});
test("codes are not all the same (it is random)", () => {
  assert.ok(new Set(Array.from({ length: 50 }, generateOtp)).size > 40);
});
test("the right code verifies, wrong code / other user does not", () => {
  const h = hashOtp("user1", "123456");
  assert.ok(checkOtp("user1", "123456", h));
  assert.ok(!checkOtp("user1", "123457", h));
  assert.ok(!checkOtp("user2", "123456", h)); // bound to the user
  assert.ok(!checkOtp("user1", "123456", "short"));
});
test("the stored value is a keyed hash, not the code", () => {
  const h = hashOtp("user1", "123456");
  assert.ok(!h.includes("123456")); assert.equal(h.length, 64);
  process.env.AUTH_SECRET = "another-secret"; // a leaked table can't be brute-forced without the server secret
  assert.notEqual(hashOtp("user1", "123456"), h);
  process.env.AUTH_SECRET = "test-secret-for-otp";
});
test("Arabic-Indic digits, Persian digits and spaces are accepted", () => {
  assert.equal(normalizeOtpInput("١٢٣٤٥٦"), "123456");
  assert.equal(normalizeOtpInput("۱۲۳ ۴۵۶"), "123456");
  assert.equal(normalizeOtpInput(" 12 34-56 "), "123456");
  assert.equal(normalizeOtpInput(undefined), "");
});
test("a code is usable only if unexpired, unused and under the attempt limit", () => {
  const now = Date.now(), ok = { verifiedAt: null, attempts: 0, expiresAt: new Date(now + 60_000) };
  assert.ok(isOtpUsable(ok, now));
  assert.ok(!isOtpUsable({ ...ok, expiresAt: new Date(now - 1) }, now));
  assert.ok(!isOtpUsable({ ...ok, attempts: MAX_ATTEMPTS }, now));
  assert.ok(!isOtpUsable({ ...ok, verifiedAt: new Date() }, now));
  assert.ok(isOtpUsable({ ...ok, attempts: MAX_ATTEMPTS - 1 }, now));
});
