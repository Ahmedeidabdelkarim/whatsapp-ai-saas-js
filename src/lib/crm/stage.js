export const STAGE_LABEL = {
    INQUIRY: "استفسار فقط", INTERESTED: "مهتم بمنتج", IN_CART: "تمت الإضافة للسلة", CHECKOUT: "بدأ إتمام الطلب",
    ABANDONED: "سلة متروكة", COMPLETED: "طلب مكتمل", HUMAN: "طلب موظف",
};
export const STATUS_LABEL = {
    ACTIVE: "AI يتولى المحادثة", HANDOFF: "بانتظار موظف", STAFF_ACTIVE: "الموظف متصل", CLOSED: "مغلقة",
};
export const EVENT_LABEL = {
    INTEREST: "اهتم بمنتج", ADD_TO_CART: "أضاف للسلة", CHECKOUT: "بدأ إتمام الطلب", ABANDONED: "ترك السلة", COMPLETED: "أكمل الطلب", HUMAN_REQUEST: "طلب موظف",
};
const RANK = { INTERESTED: 1, IN_CART: 2, CHECKOUT: 3 };
/** Next stage after an event. Shopping events only move forward; a completed/abandoned customer who shops again restarts the journey. */
export function stageAfter(current, event) {
    if (event === "HUMAN_REQUEST")
        return "HUMAN";
    if (event === "COMPLETED")
        return "COMPLETED";
    if (event === "ABANDONED")
        return "ABANDONED";
    const target = event === "INTEREST" ? "INTERESTED" : event === "ADD_TO_CART" ? "IN_CART" : "CHECKOUT";
    if (current === "HUMAN")
        return "HUMAN";
    if (current === "COMPLETED" || current === "ABANDONED")
        return target;
    const cur = current === "INQUIRY" ? 0 : RANK[current];
    return RANK[target] > cur ? target : current;
}
/** A chat session = 24h of silence (WhatsApp's customer-service window). Human-handled chats never expire on their own. */
export const SESSION_MS = 24 * 60 * 60 * 1000;
export const sessionExpired = (lastMessageAt, now = Date.now()) => now - lastMessageAt.getTime() > SESSION_MS;
