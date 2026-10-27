import { sar } from "./format";
/** The cart as a WhatsApp message: one line per product, then the total. */
export function formatCart(lines) {
    const total = lines.reduce((s, l) => s + l.quantity * l.unitHalalas, 0);
    return { total, text: lines.map((l) => `• ${l.name} ×${l.quantity} — ${sar(l.quantity * l.unitHalalas)}`).join("\n") };
}
