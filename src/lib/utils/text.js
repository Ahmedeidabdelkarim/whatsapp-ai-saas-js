/** Lowercase, strip Arabic diacritics, unify alef forms, drop punctuation. */
export const normalizeArabic = (t) => t.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
