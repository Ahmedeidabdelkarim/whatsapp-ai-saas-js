"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SubmitButton({ children, pendingText = "جارٍ الحفظ...", variant = "primary", className }) {
    const { pending } = useFormStatus();
    return <button type="submit" disabled={pending} className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70",
        variant === "primary" && "bg-wa text-bg hover:brightness-110",
        variant === "ghost" && "border border-line text-ink hover:bg-white/5",
        className,
    )}>
      {pending && <LoaderCircle aria-hidden className="size-4 animate-spin"/>}
      {pending ? pendingText : children}
    </button>;
}
