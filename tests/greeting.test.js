import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlainGreeting, smallTalkReply } from "../src/lib/utils/greeting";
test("plain greetings only trigger the welcome", () => {
    for (const t of ["السلام عليكم", "السلام عليكم ورحمة الله وبركاته", "هلا والله", "مرحبًا", "أهلاً", "Hello!", "  سلام  "])
        assert.ok(isPlainGreeting(t), t);
});
test("real questions are not greetings", () => {
    for (const t of ["عندكم عود ملكي؟", "السلام عليكم عندكم عطور رجالي", "كم سعر المسك", "ابغى موظف"])
        assert.ok(!isPlainGreeting(t), t);
});

test("greetings and thanks get canned replies (no AI needed)", () => {
  const hi = smallTalkReply("السلام عليكم");
  assert.ok(hi.text.startsWith("وعليكم السلام") && hi.menu === true);
  assert.equal(smallTalkReply("هلا والله").menu, true);
  assert.ok(smallTalkReply("مرحبا").text.startsWith("أهلاً"));
  const th = smallTalkReply("شكراً");
  assert.ok(th.text.startsWith("العفو") && th.menu === false);
  assert.ok(smallTalkReply("يعطيك العافية"));
});
test("anything else is not small talk", () => {
  for (const t of ["السلام عليكم عندكم عود؟", "كم سعر المسك", "ابغى موظف", "شكراً بس ابغى اغير الطلب"]) assert.equal(smallTalkReply(t), null, t);
});
