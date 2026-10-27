import { test } from "node:test";
import assert from "node:assert/strict";
import { wantsCheckout, wantsCancel, looksLikeAddress } from "../src/lib/utils/intent";
import { formatCart } from "../src/lib/utils/cart-text";
test("typed checkout phrases", () => {
    for (const t of ["ابغى أكمل الطلب", "إتمام الطلب", "اكمل طلبي", "checkout", "ابي ادفع", "تأكيد الطلب"])
        assert.ok(wantsCheckout(t), t);
});
test("questions about payment are not checkout", () => {
    for (const t of ["كم سعر العود", "كيف طريقة الدفع عندكم وهل تقبلون مدى وابل باي والتحويل", "السلام عليكم", "عندكم عود؟"])
        assert.ok(!wantsCheckout(t), t);
});
test("cancel words", () => {
    for (const t of ["إلغاء", "لا", "cancel", "خلاص"])
        assert.ok(wantsCancel(t), t);
    assert.ok(!wantsCancel("الرياض حي النخيل"));
});
test("address sanity", () => {
    assert.ok(looksLikeAddress("الرياض، حي النخيل، شارع 5"));
    assert.ok(looksLikeAddress("الرياض حي النخيل"));
    assert.ok(!looksLikeAddress("ok"));
    assert.ok(!looksLikeAddress("هلا"));
});
test("cart text and total", () => {
    const c = formatCart([{ name: "عود ملكي", quantity: 2, unitHalalas: 32000 }, { name: "مسك", quantity: 1, unitHalalas: 18000 }]);
    assert.equal(c.total, 82000);
    assert.ok(c.text.includes("عود ملكي ×2 — 640 ر.س"));
    assert.equal(c.text.split("\n").length, 2);
});
