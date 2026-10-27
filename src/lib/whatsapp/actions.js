const dash = (v) => v || "-";
export const ids = {
    menu: "menu", human: "human", checkout: "checkout",
    cat: (id) => `cat:${id}`, prd: (id) => `prd:${id}`, add: (id) => `add:${id}`,
    more: (categoryId, brandId, offset = 0) => `more:${dash(categoryId)}:${dash(brandId)}:${offset}`,
};
/** Ids are what WhatsApp sends back when the customer taps a list row / button. */
export function parseAction(id) {
    if (id === "menu" || id === "human" || id === "checkout")
        return { type: id };
    const [kind, a, b, c] = id.split(":");
    if ((kind === "cat" || kind === "prd" || kind === "add") && a)
        return { type: kind, id: a };
    if (kind === "more") {
        const offset = Number(c);
        if (!Number.isInteger(offset) || offset < 0)
            return null;
        return { type: "more", categoryId: a && a !== "-" ? a : undefined, brandId: b && b !== "-" ? b : undefined, offset };
    }
    return null;
}
