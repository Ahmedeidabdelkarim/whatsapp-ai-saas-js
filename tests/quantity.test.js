import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuantity } from "../src/lib/utils/quantity";

test("quantity parser accepts Western, Arabic-Indic, and Persian digits", () => {
    assert.equal(parseQuantity("2"), 2);
    assert.equal(parseQuantity("أحتاج ٢ قطعة"), 2);
    assert.equal(parseQuantity("۳"), 3);
});

test("quantity parser rejects missing, ambiguous, zero, and unsafe quantities", () => {
    for (const value of ["", "قطعتين", "0", "2 أو 3", "9007199254740992"])
        assert.equal(parseQuantity(value), null, value);
});
