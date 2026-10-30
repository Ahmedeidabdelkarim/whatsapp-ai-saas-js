"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { testAiAction } from "@/server/settings-actions";
export function AiTest({ lastError, lastErrorAt }) {
    const [state, action, pending] = useActionState(testAiAction, undefined);
    return (<section className="mt-4 space-y-3 rounded-xl border border-line/80 bg-black/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">اختبار الذكاء الاصطناعي</h3>
          <p className="mt-1 text-xs text-mute">تحقق من الاتصال والإعدادات بإرسال طلب تجريبي.</p>
        </div>
        <form action={action}>
          <Button disabled={pending}>{pending ? "جاري الاختبار..." : "بدء الاختبار"}</Button>
        </form>
      </div>
      {state?.message && <p dir="auto" className={`break-words rounded-xl border p-3 text-sm ${state.ok ? "border-wa/25 bg-wa/10 text-wa" : "border-warn/30 bg-warn/10 text-amber-100"}`}>{state.message}</p>}
      {!state && lastError && (<div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-amber-100">
          <p className="mb-1 font-semibold">آخر خطأ من الذكاء الاصطناعي{lastErrorAt ? ` (${lastErrorAt.toLocaleString("ar-SA")})` : ""}</p>
          <p dir="auto" className="break-words text-amber-100/80">{lastError}</p>
        </div>)}
    </section>);
}
