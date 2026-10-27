"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { launchFollowUpAction } from "@/server/settings-actions";
export function AbandonedCard({ count }) {
    const [state, action, pending] = useActionState(launchFollowUpAction, undefined);
    return (<div>
      <p className="text-6xl font-bold text-wa">{count}</p>
      <p className="mt-3 text-mute">تم رصدهم تلقائياً وهم جاهزين لحملة متابعة وإعادة استهداف.</p>
      <form action={action} className="mt-5"><Button disabled={count === 0 || pending} className="w-full">{pending ? "جاري الإرسال..." : "أطلق حملة المتابعة"}</Button></form>
      {state?.message && <p className={`mt-3 text-sm ${state.ok ? "text-wa" : "text-red-300"}`}>{state.message}</p>}
    </div>);
}
