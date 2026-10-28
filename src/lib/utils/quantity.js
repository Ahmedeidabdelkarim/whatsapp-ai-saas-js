export function parseQuantity(text) {
    // WhatsApp customers may type Western (2) or Arabic/Persian (٢/۲) numerals.
    const normalized = String(text).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
    const matches = normalized.match(/\d+/g);
    if (!matches || matches.length !== 1)
        return null;
    const quantity = Number(matches[0]);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

export function isRemoveAll(text) {
    const normalized = String(text).trim().replace(/\s+/g, " ");
    return /^(الكل|كله|كلها|كامل|كاملة|بالكامل|احذف الكل|حذف الكل|احذفهم كلهم|احذفها كلها|احذف المنتج كله|احذف المنتج كامل|احذف المنتج بالكامل|حذف المنتج كامل|حذف المنتج بالكامل)$/.test(normalized);
}
