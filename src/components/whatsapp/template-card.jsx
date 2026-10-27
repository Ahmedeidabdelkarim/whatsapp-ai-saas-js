"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/badge";
import { createTemplateAction } from "@/server/settings-actions";
const LABEL = {
    APPROVED: { text: "معتمد ✅ جاهز للحملات", tone: "wa" },
    PENDING: { text: "قيد المراجعة من Meta (دقائق إلى 24 ساعة)", tone: "warn" },
    REJECTED: { text: "مرفوض: عدّل النص من Meta Business Manager", tone: "warn" },
    PAUSED: { text: "موقوف مؤقتاً من Meta", tone: "warn" },
    DISABLED: { text: "معطّل من Meta", tone: "warn" },
};
export function TemplateCard({ status, connected }) {
    const [state, action, pending] = useActionState(createTemplateAction, undefined);
    const s = status ? LABEL[status] ?? { text: status, tone: "mute" } : null;
    return (<div className="space-y-3">
      <p className="text-sm text-mute">واتساب يمنع الرسائل الجاهزة خارج نافذة 24 ساعة إلا بقالب معتمد. نرسل قالب <code dir="ltr" className="text-wa">cart_followup</code> للعملاء الذين تركوا سلتهم.</p>
      <div className="flex items-center gap-2 text-sm"><span className="text-mute">الحالة:</span>{s ? <Pill tone={s.tone}>{s.text}</Pill> : <Pill>غير منشأ</Pill>}</div>
      {!status && (<form action={action}><Button disabled={pending || !connected}>{pending ? "..." : "إنشاء القالب وإرساله للمراجعة"}</Button></form>)}
      {!connected && <p className="text-xs text-mute">احفظ Business Account ID والتوكن أولاً.</p>}
      {state?.message && <p className={`text-sm ${state.ok ? "text-wa" : "text-red-300"}`}>{state.message}</p>}
    </div>);
}
