import { normalizeArabic } from "../utils/text";
const words = (t) => normalizeArabic(t).split(" ").filter(Boolean).map((w) => w.replace(/^ال/, ""));
/**
 * If a SHORT message is basically a category/brand name ("رجالي", "عطور رجالية", "عبق"), return it so we can open
 * that menu directly. Longer messages are real questions and go to the AI. Word-prefix matching handles رجالي/رجالية.
 */
export function pickKeywordMatch(text, items) {
    const tw = words(text);
    if (tw.length === 0 || tw.length > 4)
        return null;
    let best = null, bestScore = 0;
    for (const it of items) {
        const nw = words(it.name).filter((w) => w.length >= 3);
        if (nw.length === 0)
            continue;
        let score = 0, ok = true;
        for (const n of nw) {
            const hit = tw.find((w) => w.length >= 3 && (w.startsWith(n) || n.startsWith(w)));
            if (hit)
                score += n.length;
            else {
                ok = false;
                break;
            }
        }
        if (ok && score > bestScore) {
            best = it;
            bestScore = score;
        }
    }
    return best;
}
