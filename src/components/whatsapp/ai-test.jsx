"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { testAiAction } from "@/server/settings-actions";
export function AiTest({ lastError, lastErrorAt }) {
    const [state, action, pending] = useActionState(testAiAction, undefined);
    return (<div className="mt-4 space-y-3 border-t border-line/60 pt-4">
      <form action={action}><Button variant="ghost" disabled={pending}>{pending ? "جاري الاختبار..." : "اختبار الذكاء الاصطناعي"}</Button></form>
      {state?.message && <p dir="auto" className={`break-words rounded-xl p-3 text-sm ${state.ok ? "bg-wa/15 text-wa" : "bg-red-400/10 text-red-300"}`}>{state.message}</p>}
      {!state && lastError && (<div className="rounded-xl bg-red-400/10 p-3 text-xs text-red-300">
          <p className="mb-1 font-semibold">آخر خطأ من الذكاء الاصطناعي{lastErrorAt ? ` (${lastErrorAt.toLocaleString("ar-SA")})` : ""}</p>
          <p dir="auto" className="break-words">{lastError}</p>
        </div>)}
    </div>);
}
