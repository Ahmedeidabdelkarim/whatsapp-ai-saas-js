import { requestHuman, logMessage } from "@/server/conversations";
import { sendText } from "./messages";
/** The customer stays inside WhatsApp, on the same number; staff see the whole chat and reply from the dashboard. */
export async function handoffToHuman(a) {
    await requestHuman(a.conversationId);
    const text = a.text ?? "أبشر، حوّلتك لأحد الزملاء وبيرد عليك بأقرب وقت 🙏";
    await sendText(a.creds, a.to, text);
    await logMessage(a.conversationId, "OUT", text);
}
