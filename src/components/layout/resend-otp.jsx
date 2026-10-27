"use client";
import { useActionState } from "react";
import { resendOtpAction } from "@/server/auth/actions";

export function ResendOtp({ email }) {
    const [state, action, pending] = useActionState(resendOtpAction, undefined);
    return (<form action={action} className="mt-4 text-center text-sm">
      <input type="hidden" name="email" value={email}/>
      <button disabled={pending} className="text-wa hover:underline disabled:opacity-50">{pending ? "..." : "لم يصلك الرمز؟ أعد الإرسال"}</button>
      {state?.message && <p className="mt-2 text-wa">{state.message}</p>}
      {state?.error && <p className="mt-2 text-red-300">{state.error}</p>}
    </form>);
}
