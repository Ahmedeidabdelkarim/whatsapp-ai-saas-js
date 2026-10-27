import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAction, ids } from "../src/lib/whatsapp/actions";
import { pickKeywordMatch } from "../src/lib/whatsapp/keywords";
import { wantsHuman } from "../src/lib/utils/intent";
test("action ids round-trip", () => {
    assert.deepEqual(parseAction(ids.cat("c1")), { type: "cat", id: "c1" });
    assert.deepEqual(parseAction(ids.add("p9")), { type: "add", id: "p9" });
    assert.deepEqual(parseAction(ids.more("c1", undefined, 8)), { type: "more", categoryId: "c1", brandId: undefined, offset: 8 });
    assert.deepEqual(parseAction(ids.more(undefined, "b1", 0)), { type: "more", categoryId: undefined, brandId: "b1", offset: 0 });
    for (const k of ["menu", "human", "checkout"])
        assert.deepEqual(parseAction(k), { type: k });
});
test("garbage ids are rejected", () => {
    for (const id of ["", "x:1", "more:a:b:-3", "more:a:b:xyz", "cat:"])
        assert.equal(parseAction(id), null, id);
});
const items = [{ name: "رجالي", id: 1 }, { name: "نسائي", id: 2 }, { name: "عبق", id: 3 }, { name: "العطور", id: 4 }, { name: "دهن عود", id: 5 }];
test("keyword picks a category or brand from a short message", () => {
    assert.equal(pickKeywordMatch("رجالي", items)?.id, 1);
    assert.equal(pickKeywordMatch("عطور رجالية", items)?.id, 1); // longest/most specific match wins over العطور
    assert.equal(pickKeywordMatch("ابغى نسائي", items)?.id, 2);
    assert.equal(pickKeywordMatch("دهن عود", items)?.id, 5);
});
test("long questions and non-matches go to the AI", () => {
    assert.equal(pickKeywordMatch("كم سعر العود الملكي وهل متوفر عندكم اليوم", items), null);
    assert.equal(pickKeywordMatch("شكراً", items), null);
    assert.equal(pickKeywordMatch("", items), null);
});
test("direct requests for a human", () => {
    for (const t of ["ابي موظف", "أبغى خدمة العملاء", "ممكن اكلم موظف", "agent please"])
        assert.ok(wantsHuman(t), t);
    for (const t of ["عندكم عود ملكي؟", "كم السعر", "السلام عليكم"])
        assert.ok(!wantsHuman(t), t);
});
