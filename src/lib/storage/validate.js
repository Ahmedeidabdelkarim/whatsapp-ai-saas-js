const MB = 1024 * 1024;
// WhatsApp Cloud API limits: video/audio 16MB. We cap PDFs at 20MB (limit is 100MB).
const RULES = {
    IMAGE: { maxBytes: 5 * MB, mimes: { "image/jpeg": "jpg", "image/png": "png" } }, // WhatsApp image limit: 5MB
    VIDEO: { maxBytes: 16 * MB, mimes: { "video/mp4": "mp4", "video/3gpp": "3gp" } },
    VOICE: { maxBytes: 16 * MB, mimes: { "audio/ogg": "ogg", "audio/opus": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/amr": "amr" } },
    GUIDE: { maxBytes: 20 * MB, mimes: { "application/pdf": "pdf" } },
};
/** The file is served back to WhatsApp with this Content-Type, which is how WhatsApp decides what it received. */
export const EXT_MIME = {
    jpg: "image/jpeg", png: "image/png", mp4: "video/mp4", "3gp": "video/3gpp", ogg: "audio/ogg", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", amr: "audio/amr", pdf: "application/pdf",
};
export const isKind = (k) => k === "IMAGE" || k === "VIDEO" || k === "VOICE" || k === "GUIDE";
export function validateUpload(kind, mime, size) {
    if (!isKind(kind))
        return { ok: false, error: "نوع الملف غير معروف" };
    const rule = RULES[kind];
    const ext = rule.mimes[mime.split(";")[0].trim().toLowerCase()];
    if (!ext)
        return { ok: false, error: "صيغة الملف غير مدعومة لهذا النوع" };
    if (size <= 0)
        return { ok: false, error: "الملف فارغ" };
    if (size > rule.maxBytes)
        return { ok: false, error: `الحجم الأقصى ${rule.maxBytes / MB}MB` };
    return { ok: true, ext };
}
/** Checks the first bytes so a renamed file can't be uploaded under the wrong type. */
export function sniffMatches(ext, b) {
    const s = (from, to) => String.fromCharCode(...b.subarray(from, to));
    switch (ext) {
        case "pdf": return s(0, 4) === "%PDF";
        case "jpg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
        case "png": return b[0] === 0x89 && s(1, 4) === "PNG";
        case "mp4":
        case "m4a":
        case "3gp": return s(4, 8) === "ftyp";
        case "ogg": return s(0, 4) === "OggS";
        case "amr": return s(0, 5) === "#!AMR";
        case "mp3": return s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
        case "aac": return b[0] === 0xff && (b[1] & 0xf0) === 0xf0;
        default: return false;
    }
}
