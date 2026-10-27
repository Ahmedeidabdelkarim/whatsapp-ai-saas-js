"use client";
import { useActionState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { staffReplyAction } from "@/server/settings-actions";
export function ReplyBox({ conversationId }) {
    const [state, action, pending] = useActionState(staffReplyAction, undefined);
    const form = useRef(null);
    useEffect(() => { if (state?.ok)
        form.current?.reset(); }, [state]);
    return (<form ref={form} action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={conversationId}/>
      <Textarea name="text" placeholder="اكتب ردك للعميل (يصله على واتساب من نفس الرقم)" className="min-h-20" required/>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{pending ? "..." : "إرسال"}</Button>
        {state?.message && <span className={`text-sm ${state.ok ? "text-wa" : "text-red-300"}`}>{state.message}</span>}
      </div>
    </form>);
}
