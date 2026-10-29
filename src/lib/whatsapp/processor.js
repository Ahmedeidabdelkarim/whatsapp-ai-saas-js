import { prisma } from "@/lib/db/prisma";
import { getWaCreds } from "./creds";
import { sendText, sendVideo, sendVoice, sendDocument, sendImage, sendButtons } from "./messages";
import { getStoreByPhoneNumberId } from "@/lib/tenant/tenant-context";
import { upsertCustomer } from "@/server/customers";
import { getOrCreateConversation, humanInControl, logMessage, resumeFromAbandoned } from "@/server/conversations";
import { getEntitlements } from "@/lib/billing/limits";
import { runAgent } from "@/lib/ai/agent";
import { transcribe } from "@/lib/ai/transcribe";
import { aiConfigured } from "@/lib/ai/config";
import { isPlainGreeting, smallTalkReply } from "@/lib/utils/greeting";
import { wantsCheckout, wantsHuman } from "@/lib/utils/intent";
import { rateLimit } from "@/lib/utils/rate-limit";
import { parseAction, ids } from "./actions";
import { downloadMedia } from "./media";
import { handoffToHuman } from "./handoff";
import { handleAction, handleAwaiting, sendMainMenu, startCheckout, tryKeywordNav } from "./navigation";
const FALLBACK = "عذراً، صار عندي خلل بسيط. ممكن تعيد رسالتك؟ أو اضغط الزر وأحوّلك لأحد الزملاء.";
/**
 * Runs inside the queue worker. Order of decisions:
 * human in control -> just store | wants a human -> handoff | first contact -> welcome | menu taps | section keyword | AI.
 * Menus never need the AI, so browsing works even when AI is off, rate-limited or out of budget.
 * Throwing = the job is retried with backoff.
 */
export async function processWaMessage(p) {
    const m = p.message;
    const store = await getStoreByPhoneNumberId(p.phoneNumberId);
    const creds = store ? getWaCreds(store) : null;
    if (!store || !creds) {
        console.warn(`[wa] ${p.phoneNumberId}: store not connected (phone number id / token missing)`);
        return;
    }
    const tag = `[wa ${store.slug}/${m.from}]`;
    const ent = await getEntitlements(store.id);
    const customer = await upsertCustomer(store.id, m.from, p.profileName);
    let conv = await getOrCreateConversation(store.id, customer.id);
    const nav = { storeId: store.id, conversationId: conv.id, customerId: customer.id, to: m.from, creds, awaiting: conv.awaiting };
    // ---- understand the incoming message ----
    let text = m.text?.body ?? "";
    let action = null;
    if (m.type === "interactive") {
        const reply = m.interactive?.list_reply ?? m.interactive?.button_reply;
        action = reply ? parseAction(reply.id) : null;
        text = reply?.title ?? "";
    }
    else if (m.type === "audio" && m.audio) {
        const heard = ent.voice ? await hearVoice(creds, m.audio) : null;
        if (!heard) {
            await sendText(creds, m.from, "حالياً أقدر أرد على الرسائل النصية فقط 🙏");
            return;
        }
        text = heard;
    }
    if (!text && !action) {
        await sendText(creds, m.from, "حالياً أقدر أرد على الرسائل النصية فقط 🙏");
        return;
    }
    if (!(await prisma.message.findUnique({ where: { waMessageId: m.id } })))
        await logMessage(conv.id, "IN", m.type === "audio" ? `🎤 ${text}` : text, m.type === "interactive" ? "INTERACTIVE" : "TEXT", m.id);
    if (conv.stage === "ABANDONED")
        await resumeFromAbandoned(conv.id);
    // 1) A human is handling this chat: the bot stays silent, staff answer from the dashboard.
    if (conv.status === "HANDOFF" || conv.status === "STAFF_ACTIVE")
        return void console.log(`${tag} stored (${conv.status}), waiting for staff`);
    // 2) "talk to an agent" button or phrases like "أبي موظف"
    if (action?.type === "human" || (!action && wantsHuman(text))) {
        if (!conv.welcomed)
            await prisma.conversation.update({ where: { id: conv.id }, data: { welcomed: true } });
        return handoffToHuman({ conversationId: conv.id, creds, to: m.from });
    }
    // 3) First contact -> welcome package. A bare greeting ends here; a real question continues below.
    if (!conv.welcomed) {
        await sendWelcome(store, nav);
        if (!action && isPlainGreeting(text))
            return;
    }
    // 4) Waiting for the delivery address? The next plain message is the answer (tapping any menu button cancels that).
    if (conv.awaiting) {
        if (action)
            await prisma.conversation.update({ where: { id: conv.id }, data: { awaiting: null } });
        else if (await handleAwaiting(nav, text))
            return;
    }
    // 5) Pleasantries ("السلام عليكم", "شكراً") get a canned answer: no AI call, works even when the AI is down.
    const chat = action ? null : smallTalkReply(text);
    if (chat) {
        await sendText(creds, m.from, chat.text);
        await logMessage(conv.id, "OUT", chat.text);
        if (chat.menu)
            await sendMainMenu(nav);
        return;
    }
    // 6) Menu taps, typed checkout, then short section/brand names. No AI needed.
    if (action) {
        const r = await handleAction(nav, action);
        if (r.handled)
            return;
        if (r.aiText)
            text = r.aiText;
    }
    else if (wantsCheckout(text)) {
        await startCheckout(nav);
        return;
    }
    else if (await tryKeywordNav(nav, text))
        return;
    // 7) AI, if the plan, the budget and the config allow it.
    if (!store.aiEnabled)
        return void console.log(`${tag} AI skipped: disabled in dashboard/ai`);
    if (!ent.canChat)
        return void console.log(`${tag} AI skipped: ${ent.reason}`);
    if (!aiConfigured())
        return void console.error(`${tag} AI skipped: no AI key configured (see .env: AI_PROVIDER / OPENAI_API_KEY / ANTHROPIC_API_KEY)`);
    if (!rateLimit(`ai:${store.id}:${m.from}`, 20, 60_000).ok)
        return void console.warn(`${tag} AI skipped: sender is flooding (20+/min)`);
    if (conv.aiTokens >= ent.sessionTokens) {
        console.log(`${tag} AI session budget used (${conv.aiTokens}/${ent.sessionTokens}), offering a human`);
        return handoffToHuman({ conversationId: conv.id, creds, to: m.from, text: "وصلنا للحد الأقصى للرد الآلي في هذه الجلسة، حوّلتك لأحد الزملاء ليكمل معك 🙏" });
    }
    try {
        const r = await runAgent({ storeId: store.id, conversationId: conv.id, customerId: customer.id, customerWaId: m.from, creds });
        if (store.lastAiError)
            await prisma.store.update({ where: { id: store.id }, data: { lastAiError: null, lastAiErrorAt: null } });
        if (r.outputTokens)
            await prisma.conversation.update({ where: { id: conv.id }, data: { aiTokens: { increment: r.outputTokens } } });
        if (await humanInControl(conv.id))
            return void console.log(`${tag} AI reply discarded: a human took over while it was generating`);
        if (r.text) {
            await sendText(creds, m.from, r.text);
            await logMessage(conv.id, "OUT", r.text);
        }
        else if (!r.usedTools)
            await sendFallback(nav);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`${tag} AI failed:`, msg);
        await prisma.store.update({ where: { id: store.id }, data: { lastAiError: msg.slice(0, 500), lastAiErrorAt: new Date() } }).catch(() => { });
        await sendFallback(nav);
    }
}
async function sendFallback(c) {
    await sendButtons(c.creds, c.to, { body: FALLBACK, buttons: [{ id: ids.menu, title: "القائمة" }, { id: ids.human, title: "التحدث مع موظف" }] });
    await logMessage(c.conversationId, "OUT", FALLBACK);
}
async function hearVoice(creds, audio) {
    try {
        const media = await downloadMedia(creds, audio.id);
        return media ? await transcribe(media.buf, media.mime || audio.mime_type || "audio/ogg") : null;
    }
    catch (e) {
        console.error("[voice] failed:", e.message);
        return null;
    }
}
async function sendWelcome(store, c) {
    const log = (b, t) => logMessage(c.conversationId, "OUT", b, t);
    await requireWelcomeSend(sendText(c.creds, c.to, store.greeting), "greeting");
    await logMessage(c.conversationId, "OUT", store.greeting);
    const assets = await prisma.welcomeAsset.findMany({ where: { storeId: store.id, enabled: true } });
    const by = Object.fromEntries(assets.map((a) => [a.kind, a.url]));
    if (by.IMAGE) {
        await requireWelcomeSend(sendImage(c.creds, c.to, by.IMAGE), "image");
        await log("[صورة تعريفية]", "IMAGE");
    }
    if (by.VIDEO) {
        await requireWelcomeSend(sendVideo(c.creds, c.to, by.VIDEO, "فيديو تعريفي"), "video");
        await log("[فيديو تعريفي]", "VIDEO");
    }
    if (by.VOICE) {
        await requireWelcomeSend(sendVoice(c.creds, c.to, by.VOICE), "voice note");
        await log("[رسالة صوتية]", "AUDIO");
    }
    if (by.GUIDE) {
        await requireWelcomeSend(sendDocument(c.creds, c.to, by.GUIDE, "دليل-الشراء.pdf"), "guide");
        await log("[دليل الشراء]", "DOCUMENT");
    }
    await sendMainMenu(c);
    await prisma.conversation.update({ where: { id: c.conversationId }, data: { welcomed: true } }); // last, so a crash mid-way re-sends rather than skips
}
async function requireWelcomeSend(result, asset) {
    if (!await result)
        throw new Error(`WhatsApp rejected the welcome ${asset}; verify the media URL is publicly accessible over HTTPS and the S3 object allows s3:GetObject.`);
}
