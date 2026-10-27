import { waSend } from "./client";
export const sendText = (c, to, body) => waSend(c, { to, type: "text", text: { body, preview_url: false } });
export const sendVideo = (c, to, link, caption) => waSend(c, { to, type: "video", video: { link, caption } });
export const sendVoice = (c, to, link) => waSend(c, { to, type: "audio", audio: { link } });
export const sendDocument = (c, to, link, filename) => waSend(c, { to, type: "document", document: { link, filename } });
/** Product card: image + name, price, availability (as in the demo video). */
export const sendProductCard = (c, to, p) => {
    const caption = `*${p.name}*\n${p.price} · ${p.inStock ? "متوفر" : "غير متوفر"}`;
    return p.imageUrl
        ? waSend(c, { to, type: "image", image: { link: p.imageUrl, caption } })
        : sendText(c, to, caption);
};
/** The "تصفّح الأقسام" list menu. WhatsApp allows max 10 rows. */
export const sendCategoryMenu = (c, to, body, cats) => waSend(c, {
    to, type: "interactive",
    interactive: {
        type: "list", body: { text: body },
        action: {
            button: "تصفّح الأقسام",
            sections: [{ title: "الأقسام", rows: cats.slice(0, 10).map((x) => ({ id: `cat:${x.id}`, title: x.name.slice(0, 24) })) }],
        },
    },
});
export const sendImage = (c, to, link, caption) => waSend(c, { to, type: "image", image: { link, caption } });
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
/** Interactive list. WhatsApp limits: 10 rows total, title 24, description 72, button label 20. */
export const sendList = (c, to, o) => waSend(c, {
    to, type: "interactive",
    interactive: {
        type: "list", body: { text: cut(o.body, 1024) },
        action: { button: cut(o.button, 20), sections: o.sections.map((s) => ({ title: cut(s.title, 24), rows: s.rows.map((r) => ({ id: r.id, title: cut(r.title, 24), ...(r.description ? { description: cut(r.description, 72) } : {}) })) })) },
    },
});
/** Reply buttons (max 3, title 20 chars), optionally with an image header. */
export const sendButtons = (c, to, o) => waSend(c, {
    to, type: "interactive",
    interactive: {
        type: "button", ...(o.headerImage ? { header: { type: "image", image: { link: o.headerImage } } } : {}),
        body: { text: cut(o.body, 1024) },
        action: { buttons: o.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: cut(b.title, 20) } })) },
    },
});
