const dash = (v) => v || "-";
export const ids = {
    menu: "menu", human: "human", checkout: "checkout",
    cart: "cart", cartRemove: "cart:remove",
    cat: (id) => `cat:${id}`, prd: (id) => `prd:${id}`, add: (id) => `add:${id}`,
    removeCartItem: (id) => `cart:delete:${id}`,
    removeCartItemAll: (id) => `cart:delete-all:${id}`,
    cancelCartRemoval: "cart:cancel-remove",
    moreCartItems: (offset = 0) => `cart:more:${offset}`,
    more: (categoryId, brandId, offset = 0) => `more:${dash(categoryId)}:${dash(brandId)}:${offset}`,
};
/** Ids are what WhatsApp sends back when the customer taps a list row / button. */
export function parseAction(id) {
    if (id === "menu" || id === "human" || id === "checkout" || id === "cart")
        return { type: id };
    if (id === "cart:remove")
        return { type: "cart_remove" };
    if (id === "cart:cancel-remove")
        return { type: "cart_cancel_remove" };
    const [kind, a, b, c] = id.split(":");
    if (kind === "cart" && a === "delete-all" && b)
        return { type: "cart_delete_all", id: b };
    if (kind === "cart" && a === "delete" && b)
        return { type: "cart_delete", id: b };
    if (kind === "cart" && a === "more") {
        const offset = Number(b);
        if (!Number.isInteger(offset) || offset < 0)
            return null;
        return { type: "cart_more", offset };
    }
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
