import { normalizeArabic as norm } from "./text";
const GREETING = /^(السلام عليكم|سلام عليكم|السلام|سلام|مرحبا|هلا|اهلا|اهلين|hi|hello|hey|صباح الخير|مساء الخير)( ورحمه الله وبركاته| ورحمة الله وبركاته| والله| وغلا| بك| بكم| فيك)?$/;
/** A bare greeting only triggers the welcome package; anything else is also answered by the AI. */
export const isPlainGreeting = (text) => GREETING.test(norm(text));

const THANKS = /^(شكرا|شكرا لك|شكرا جزيلا|الف شكر|مشكور|يعطيك العافيه|يعطيك العافية|thanks|thank you|thx)$/;
/**
 * Canned answers for pure pleasantries, so "السلام عليكم" or "شكراً" never costs an AI call (and still works when the AI is
 * down, out of quota or turned off). Returns null for anything else.
 */
export function smallTalkReply(text) {
    const n = norm(text);
    if (isPlainGreeting(text))
        return { text: n.includes("سلام") ? "وعليكم السلام ورحمة الله وبركاته 🌹 كيف أقدر أخدمك؟" : "أهلاً وسهلاً بك 🌹 كيف أقدر أخدمك؟", menu: true };
    if (THANKS.test(n))
        return { text: "العفو 🌹 أي خدمة ثانية أنا حاضر.", menu: false };
    return null;
}
