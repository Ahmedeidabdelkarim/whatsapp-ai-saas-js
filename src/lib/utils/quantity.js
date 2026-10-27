export function parseQuantity(text) {
    const normalized = String(text).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
    const matches = normalized.match(/\d+/g);
    if (!matches || matches.length !== 1)
        return null;
    const quantity = Number(matches[0]);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}
