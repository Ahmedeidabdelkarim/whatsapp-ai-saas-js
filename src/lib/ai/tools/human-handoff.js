import { handoffToHuman } from "@/lib/whatsapp/handoff";
export const humanHandoffTool = {
    def: { name: "human_handoff", description: "حوّل المحادثة لموظف حقيقي وأوقف البوت.", input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } },
    async run(ctx) {
        await handoffToHuman({ conversationId: ctx.conversationId, creds: ctx.creds, to: ctx.customerWaId });
        return { handed_off: true };
    },
};
