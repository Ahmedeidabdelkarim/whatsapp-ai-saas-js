import { test } from "node:test";
import assert from "node:assert/strict";
import { isRemoveAll, parseQuantity } from "../src/lib/utils/quantity";

test("quantity parser accepts Western, Arabic-Indic, and Persian digits", () => {
    assert.equal(parseQuantity("2"), 2);
    assert.equal(parseQuantity("أحتاج 2 قطعة"), 2);
    assert.equal(parseQuantity("أحتاج ٢ قطعة"), 2);
    assert.equal(parseQuantity("أحتاج ٢٢ قطعة"), 22);
    assert.equal(parseQuantity("۳"), 3);
});

test("quantity parser rejects missing, ambiguous, zero, and unsafe quantities", () => {
    for (const value of ["", "قطعتين", "0", "2 أو 3", "9007199254740992"])
        assert.equal(parseQuantity(value), null, value);
});

test("cart removal accepts an explicit request to remove the full product quantity", () => {
    for (const value of ["الكل", "كله", "احذف المنتج كامل", "احذف المنتج بالكامل", "حذف المنتج كامل", "احذفها كلها"])
        assert.equal(isRemoveAll(value), true, value);
    for (const value of ["2", "احذف 2", "لا تحذف الكل"])
        assert.equal(isRemoveAll(value), false, value);
});
