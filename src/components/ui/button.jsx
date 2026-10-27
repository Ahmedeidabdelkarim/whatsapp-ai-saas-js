import { cn } from "@/lib/utils/cn";
export function Button({ variant = "primary", className, ...p }) {
    return (<button {...p} className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50", variant === "primary" && "bg-wa text-bg hover:brightness-110", variant === "ghost" && "border border-line text-ink hover:bg-white/5", variant === "danger" && "border border-red-400/40 text-red-300 hover:bg-red-400/10", className)}/>);
}
