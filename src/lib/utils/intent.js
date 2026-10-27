import { normalizeArabic } from "./text";
const HUMAN = /(^| )(موظف|موظفين|موظفه|خدمه العملاء|خدمة العملاء|مدير|انسان|احد يرد|اكلم احد|human|agent|support)( |$)/;
/** "أبي موظف" / "خدمة العملاء" -> hand off immediately, no AI. */
export const wantsHuman = (text) => HUMAN.test(normalizeArabic(text));
const wordCount = (t) => t.split(" ").filter(Boolean).length;
const CHECKOUT = /(اكمل|اتمم|اكمال|اتمام|تاكيد|اكد) (ال)?طلب|checkout|(ابغى|ابي|ابغي|اريد|بغيت) (ادفع|الدفع)/;
/** "ابغى أكمل الطلب" typed as text behaves exactly like tapping the checkout button. Short messages only. */
export const wantsCheckout = (text) => { const n = normalizeArabic(text); return wordCount(n) <= 7 && CHECKOUT.test(n); };
const CANCEL = /^(الغاء|الغي|الغيه|cancel|لا|لا شكرا|خلاص|بطلت|ما ابي|مو الحين)$/;
export const wantsCancel = (text) => CANCEL.test(normalizeArabic(text));
/** Cheap sanity check before creating an order: at least two words, or a long single line. */
export const looksLikeAddress = (text) => { const n = normalizeArabic(text); return wordCount(n) >= 2 ? n.length >= 6 : n.length >= 10; };
