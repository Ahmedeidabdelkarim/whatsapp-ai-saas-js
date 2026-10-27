"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** fields: [{ name, label, type?, placeholder?, inputMode?, maxLength?, autoComplete?, className? }] */
export function AuthForm({ action, fields, submit, hidden }) {
    const [state, formAction, pending] = useActionState(action, undefined);
    return (<form action={formAction} className="space-y-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v}/>)}
      {fields.map((f) => (<label key={f.name} className="block text-sm"><span className="mb-1 block text-mute">{f.label}</span>
          <Input name={f.name} type={f.type ?? "text"} required placeholder={f.placeholder} inputMode={f.inputMode} maxLength={f.maxLength} autoComplete={f.autoComplete} className={f.className} dir={f.type === "email" || f.type === "password" || f.inputMode === "numeric" ? "ltr" : undefined}/></label>))}
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
      {state?.message && <p className="rounded-xl bg-wa/15 p-3 text-sm text-wa">{state.message}</p>}
      <Button disabled={pending} className="w-full">{pending ? "..." : submit}</Button>
    </form>);
}
