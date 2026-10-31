import { prisma } from "@/lib/db/prisma";
import { sar } from "@/lib/utils/format";
import { addToCart, getCart, removeCartQuantity, removeFromCart } from "@/server/carts";
import { createOrderWithInvoice, sendPaymentLink } from "@/server/orders/checkout-flow";
import { formatCart } from "@/lib/utils/cart-text";
import { looksLikeAddress, wantsCancel } from "@/lib/utils/intent";
import { logMessage } from "@/server/conversations";
import { recordEvent } from "@/server/events";
import { sendButtons, sendList, sendText } from "./messages";
import { ids } from "./actions";
import { pickKeywordMatch } from "./keywords";
import { normalizeArabic } from "@/lib/utils/text";
import { isRemoveAll, parseQuantity } from "@/lib/utils/quantity";
const PAGE = 8; // 8 rows + "more" + "talk to agent" = WhatsApp's 10-row limit
const HUMAN_SECTION = { title: "مساعدة", rows: [{ id: ids.human, title: "التحدث مع موظف" }] };
const CART_SECTION = { title: "سلتك", rows: [{ id: ids.cart, title: "عرض السلة" }] };
const log = (c, body) => logMessage(c.conversationId, "OUT", body, "INTERACTIVE");
const say = async (c, text) => { await sendText(c.creds, c.to, text); await logMessage(c.conversationId, "OUT", text); };
const stockWord = (n) => (n > 0 ? "متوفر" : "غير متوفر");
/** Main menu: store sections, with "talk to an agent" as a secondary option (as in the product spec). */
export async function sendMainMenu(c, intro = "وش تبحث عنه اليوم؟ اختر من القائمة") {
    const cats = await prisma.category.findMany({ where: { storeId: c.storeId, parentId: null }, orderBy: { name: "asc" }, take: 8 });
    if (!cats.length) {
        await sendButtons(c.creds, c.to, { body: intro, buttons: [{ id: ids.cart, title: "عرض السلة" }, { id: ids.human, title: "التحدث مع موظف" }] });
        await log(c, intro);
        return;
    }
    await sendList(c.creds, c.to, { body: intro, button: "تصفّح الأقسام", sections: [{ title: "الأقسام", rows: cats.map((x) => ({ id: ids.cat(x.id), title: x.name })) }, CART_SECTION, HUMAN_SECTION] });
    await log(c, "[قائمة الأقسام]");
}
/** Section -> sub-sections -> brands -> products. */
async function showCategory(c, categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, storeId: c.storeId }, include: { children: { orderBy: { name: "asc" }, take: 7 } } });
    if (!cat)
        return sendMainMenu(c);
    if (cat.children.length) {
        const rows = [...cat.children.map((x) => ({ id: ids.cat(x.id), title: x.name })), { id: ids.more(cat.id, undefined, 0), title: `كل منتجات ${cat.name}` }];
        await sendList(c.creds, c.to, { body: `${cat.name}: اختر القسم`, button: "اختر", sections: [{ title: cat.name, rows }, HUMAN_SECTION] });
        return log(c, `[قائمة ${cat.name}]`);
    }
    const brands = await prisma.brand.findMany({ where: { storeId: c.storeId, products: { some: { categoryId, active: true } } }, orderBy: { name: "asc" }, take: 8 });
    if (brands.length >= 2) {
        const rows = brands.map((b) => ({ id: ids.more(categoryId, b.id, 0), title: b.name }));
        await sendList(c.creds, c.to, { body: `${cat.name}: اختر الماركة`, button: "الماركات", sections: [{ title: "الماركات", rows: [...rows.slice(0, 7), { id: ids.more(categoryId, undefined, 0), title: "كل الماركات" }] }, HUMAN_SECTION] });
        return log(c, `[ماركات ${cat.name}]`);
    }
    return showProducts(c, categoryId, undefined, 0);
}
async function showProducts(c, categoryId, brandId, offset) {
    const where = {
        storeId: c.storeId, active: true, ...(brandId ? { brandId } : {}),
        ...(categoryId ? { OR: [{ categoryId }, { category: { parentId: categoryId } }] } : {}),
    };
    const [total, items] = await Promise.all([prisma.product.count({ where }), prisma.product.findMany({ where, orderBy: { name: "asc" }, skip: offset, take: PAGE })]);
    if (!items.length) {
        await say(c, "ما لقيت منتجات هنا حالياً 🙏");
        return sendMainMenu(c);
    }
    const rows = items.map((p) => ({ id: ids.prd(p.id), title: p.name, description: `${sar(p.priceHalalas)} · ${stockWord(p.stock)}` }));
    if (offset + PAGE < total)
        rows.push({ id: ids.more(categoryId, brandId, offset + PAGE), title: "عرض المزيد" });
    await sendList(c.creds, c.to, { body: "اختر المنتج لعرض تفاصيله", button: "المنتجات", sections: [{ title: "المنتجات", rows }, HUMAN_SECTION] });
    await log(c, `[قائمة منتجات: ${items.map((p) => p.name).join("، ")}]`);
}
/** Product card with the next-step buttons: add to cart / keep shopping / agent. */
async function showProduct(c, productId) {
    const p = await prisma.product.findFirst({ where: { id: productId, storeId: c.storeId, active: true } });
    if (!p) {
        await say(c, "هذا المنتج غير متوفر حالياً.");
        return sendMainMenu(c);
    }
    await prisma.productInquiry.create({ data: { productId: p.id, conversationId: c.conversationId } });
    await recordEvent({ conversationId: c.conversationId, type: "INTEREST", productId: p.id });
    const body = `*${p.name}*\n${sar(p.priceHalalas)} · ${stockWord(p.stock)}${p.description ? `\n${p.description.slice(0, 300)}` : ""}${p.stock > 0 ? "\n\nكم قطعة تحتاج؟ اكتب العدد بالأرقام العربية أو الإنجليزية، مثل ٢ أو 2." : ""}`;
    const buttons = [...(p.stock > 0 ? [{ id: ids.cart, title: "عرض السلة" }, { id: ids.menu, title: "متابعة التسوق" }] : []), { id: ids.human, title: "التحدث مع موظف" }];
    if (p.stock > 0)
        await prisma.conversation.update({ where: { id: c.conversationId }, data: { awaiting: `QUANTITY:${p.id}` } });
    await sendButtons(c.creds, c.to, { body, buttons, headerImage: p.imageUrl });
    await logMessage(c.conversationId, "OUT", `[بطاقة منتج] ${p.name} — ${sar(p.priceHalalas)}`, "IMAGE");
}
/** Runs a tapped list row / button. `human` is handled by the caller. */
export async function handleAction(c, a) {
    switch (a.type) {
        case "menu":
            await sendMainMenu(c);
            return { handled: true };
        case "cat":
            await showCategory(c, a.id);
            return { handled: true };
        case "more":
            await showProducts(c, a.categoryId, a.brandId, a.offset);
            return { handled: true };
        case "prd":
            await showProduct(c, a.id);
            return { handled: true };
        case "add":
            await prisma.conversation.update({ where: { id: c.conversationId }, data: { awaiting: `QUANTITY:${a.id}` } });
            await say(c, "كم قطعة تحتاج؟ اكتب العدد بالأرقام العربية أو الإنجليزية، مثل ٢ أو 2.");
            return { handled: true };
        case "cart":
            await showCart(c);
            return { handled: true };
        case "cart_remove":
            await showCartRemoveMenu(c);
            return { handled: true };
        case "cart_more":
            await showCartRemoveMenu(c, a.offset);
            return { handled: true };
        case "cart_delete":
            await prisma.conversation.update({ where: { id: c.conversationId }, data: { awaiting: `CART_REMOVE:${a.id}` } });
            await askCartRemovalQuantity(c, a.id);
            return { handled: true };
        case "cart_delete_all":
            await removeFromCart(c.conversationId, a.id);
            await say(c, "تم حذف المنتج بالكامل من سلتك.");
            await showCart(c);
            return { handled: true };
        case "cart_cancel_remove":
            await clearAwaiting(c);
            await say(c, "تم إلغاء حذف المنتج، وسلتك كما هي.");
            await showCart(c);
            return { handled: true };
        case "checkout":
            await startCheckout(c);
            return { handled: true };
        default: return { handled: false };
    }
}
/** Short messages matching a section, brand, or product open it directly without an AI call. */
export async function tryKeywordNav(c, text) {
    const [cats, brands] = await Promise.all([
        prisma.category.findMany({ where: { storeId: c.storeId }, select: { id: true, name: true } }),
        prisma.brand.findMany({ where: { storeId: c.storeId }, select: { id: true, name: true } }),
    ]);
    const hit = pickKeywordMatch(text, [...cats.map((x) => ({ ...x, kind: "cat" })), ...brands.map((x) => ({ ...x, kind: "brand" }))]);
    if (hit?.kind === "cat")
        await showCategory(c, hit.id);
    else if (hit?.kind === "brand")
        await showProducts(c, undefined, hit.id, 0);
    if (hit)
        return true;
    const words = normalizeArabic(text).split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 4)
        return false;
    const products = await prisma.product.findMany({
        where: { storeId: c.storeId, active: true },
        select: { id: true, name: true },
    });
    const product = pickKeywordMatch(text, products);
    if (!product)
        return false;
    await showProduct(c, product.id);
    return true;
}
const clearAwaiting = (c) => prisma.conversation.update({ where: { id: c.conversationId }, data: { awaiting: null } });
async function askCartRemovalQuantity(c, productId) {
    const cart = await getCart(c.conversationId);
    const item = cart?.items.find((entry) => entry.productId === productId);
    if (!item) {
        await clearAwaiting(c);
        await say(c, "هذا المنتج لم يعد موجوداً في السلة.");
        return showCart(c);
    }
    const body = `في سلتك ${item.quantity} من ${item.product.name}. كم قطعة تريد حذفها؟ اكتب العدد، أو اختر حذف المنتج بالكامل.`;
    await sendButtons(c.creds, c.to, { body, buttons: [
        { id: ids.removeCartItemAll(productId), title: "حذف المنتج بالكامل" },
        { id: ids.cancelCartRemoval, title: "إلغاء" },
    ] });
    await log(c, body);
}
/** Show current cart contents and let the customer remove items, check out, or continue shopping. */
async function showCart(c) {
    const cart = await getCart(c.conversationId);
    if (!cart?.items.length) {
        await say(c, "سلتك فاضية حالياً 🛒");
        return sendMainMenu(c);
    }
    const { text, total } = formatCart(cart.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitHalalas: item.product.priceHalalas,
    })));
    await say(c, `🛒 محتويات سلتك:\n${text}\n\nالإجمالي: ${sar(total)}`);
    const prompt = "تقدر تحذف منتج، تكمل الطلب، أو تتابع التسوق.";
    await sendButtons(c.creds, c.to, { body: prompt, buttons: [
        { id: ids.cartRemove, title: "حذف منتج" },
        { id: ids.checkout, title: "إتمام الطلب" },
        { id: ids.menu, title: "متابعة التسوق" },
    ] });
    await log(c, prompt);
}
/** WhatsApp allows at most 10 list rows, so large carts are paginated. */
async function showCartRemoveMenu(c, offset = 0) {
    const cart = await getCart(c.conversationId);
    if (!cart?.items.length) {
        await say(c, "سلتك فاضية، ما فيه منتجات لحذفها.");
        return sendMainMenu(c);
    }
    const pageSize = 9;
    const items = cart.items.slice(offset, offset + pageSize);
    if (!items.length)
        return showCart(c);
    const rows = items.map((item) => ({
        id: ids.removeCartItem(item.productId),
        title: `حذف ${item.product.name}`,
        description: `الكمية في السلة: ${item.quantity}`,
    }));
    if (offset + pageSize < cart.items.length)
        rows.push({ id: ids.moreCartItems(offset + pageSize), title: "عرض المزيد" });
    await sendList(c.creds, c.to, {
        body: "اختر المنتج الذي تريد حذفه من سلتك",
        button: "حذف منتج",
        sections: [{ title: "منتجات السلة", rows }],
    });
    await log(c, "[قائمة حذف منتجات السلة]");
}
/** Checkout button (or "ابغى أكمل الطلب"): show the cart + total, ask for the address. No AI involved. */
export async function startCheckout(c) {
    const cart = await getCart(c.conversationId);
    if (!cart?.items.length) {
        await say(c, "سلتك فاضية حالياً 🛒 تصفّح المنتجات وأضف اللي يعجبك.");
        return sendMainMenu(c);
    }
    await recordEvent({ conversationId: c.conversationId, type: "CHECKOUT" });
    const { text, total } = formatCart(cart.items.map((i) => ({ name: i.product.name, quantity: i.quantity, unitHalalas: i.product.priceHalalas })));
    const body = `سلتك:\n${text}\n\nالإجمالي: ${sar(total)}\n\nاكتب عنوان التوصيل (المدينة، الحي، الشارع) وأكمل لك الطلب.`;
    await prisma.conversation.update({ where: { id: c.conversationId }, data: { awaiting: "ADDRESS" } });
    await sendButtons(c.creds, c.to, { body, buttons: [{ id: ids.menu, title: "متابعة التسوق" }, { id: ids.human, title: "التحدث مع موظف" }] });
    await log(c, body);
}
/** The bot asked for an address: the next plain message is the answer. Returns true when it consumed the message. */
export async function handleAwaiting(c, text) {
    if (c.awaiting?.startsWith("CART_REMOVE:")) {
        const productId = c.awaiting.slice("CART_REMOVE:".length);
        if (wantsCancel(text)) {
            await clearAwaiting(c);
            await say(c, "تم إلغاء حذف المنتج، وسلتك كما هي.");
            await showCart(c);
            return true;
        }
        if (isRemoveAll(text)) {
            await removeFromCart(c.conversationId, productId);
            await clearAwaiting(c);
            await say(c, "تم حذف المنتج بالكامل من سلتك.");
            await showCart(c);
            return true;
        }
        const quantity = parseQuantity(text);
        if (!quantity) {
            await say(c, "اكتب عدد القطع التي تريد حذفها بالأرقام، أو اختر «حذف المنتج بالكامل».");
            return true;
        }
        const result = await removeCartQuantity(c.conversationId, productId, quantity);
        if (!result.ok) {
            await say(c, result.error);
            await askCartRemovalQuantity(c, productId);
            return true;
        }
        await clearAwaiting(c);
        const remaining = result.remaining > 0 ? `باقي ${result.remaining} من ${result.name} في سلتك.` : `تم حذف ${result.name} بالكامل من سلتك.`;
        await say(c, `تم حذف ${result.removed} من ${result.name}. ${remaining}`);
        await showCart(c);
        return true;
    }
    if (c.awaiting?.startsWith("QUANTITY:")) {
        if (wantsCancel(text)) {
            await clearAwaiting(c);
            await say(c, "تم إلغاء إضافة المنتج للسلة.");
            await sendMainMenu(c);
            return true;
        }
        const quantity = parseQuantity(text);
        if (!quantity) {
            await say(c, "اكتب عدد القطع بالأرقام العربية أو الإنجليزية، مثلاً: ٢ أو 2.");
            return true;
        }
        const productId = c.awaiting.slice("QUANTITY:".length);
        const result = await addToCart(c.storeId, c.conversationId, productId, quantity);
        if (!result.ok) {
            await say(c, result.error);
            if (result.maxAdditional !== undefined) {
                const prompt = `اكتب كمية جديدة لا تتجاوز ${result.maxAdditional}، أو راجع سلتك.`;
                await sendButtons(c.creds, c.to, { body: prompt, buttons: [
                    { id: ids.cart, title: "عرض السلة" },
                    { id: ids.menu, title: "متابعة التسوق" },
                    { id: ids.human, title: "التحدث مع موظف" },
                ] });
                await log(c, prompt);
            }
            return true;
        }
        await clearAwaiting(c);
        const body = `تمت إضافة ${result.name} للسلة ✅ (الكمية: ${result.quantity})`;
        await sendButtons(c.creds, c.to, { body, buttons: [{ id: ids.checkout, title: "إتمام الطلب" }, { id: ids.cart, title: "عرض السلة" }, { id: ids.human, title: "التحدث مع موظف" }] });
        await log(c, body);
        return true;
    }
    if (wantsCancel(text)) {
        await clearAwaiting(c);
        await say(c, "تم إلغاء إتمام الطلب، وسلتك محفوظة 🛒");
        await sendMainMenu(c);
        return true;
    }
    if (!looksLikeAddress(text)) {
        await say(c, "ممكن تكتب العنوان بشكل أوضح؟ مثال: الرياض، حي النخيل، شارع 5");
        return true;
    }
    await clearAwaiting(c); // before creating the order, so a retried job can never create it twice
    const r = await createOrderWithInvoice(c.storeId, c.conversationId, c.customerId, text);
    if (!r.ok) {
        await say(c, `${r.error} 🙏`);
        await sendMainMenu(c);
        return true;
    }
    await say(c, `تم إنشاء طلبك #${r.label} ✅\nالعنوان: ${text}`);
    await sendPaymentLink(c, r.label, r.totalHalalas, r.paymentUrl, r.items);
    return true;
}
