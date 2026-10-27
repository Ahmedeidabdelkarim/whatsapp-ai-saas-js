import { prisma } from "@/lib/db/prisma";
/** Last N messages as model history: starts with "user", consecutive same-role messages merged. */
export async function loadHistory(conversationId, limit = 20) {
    const rows = await prisma.message.findMany({
        where: { conversationId, type: { in: ["TEXT", "INTERACTIVE", "IMAGE"] } },
        orderBy: { createdAt: "desc" }, take: limit,
    });
    const out = [];
    for (const m of rows.reverse()) {
        const role = m.direction === "IN" ? "user" : "assistant";
        if (!out.length && role !== "user")
            continue;
        const last = out[out.length - 1];
        if (last && last.role === role)
            last.content += "\n" + m.body;
        else
            out.push({ role, content: m.body });
    }
    return out;
}
