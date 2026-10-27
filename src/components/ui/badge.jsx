import { cn } from "@/lib/utils/cn";
export function StockBadge({ stock }) {
    return <span className={cn("inline-block min-w-12 rounded-full px-3 py-1 text-center text-xs font-bold", stock <= 3 ? "bg-warn/30 text-amber-200" : "bg-wa/25 text-wa")}>{stock}</span>;
}
export const Pill = ({ children, tone = "mute" }) => (<span className={cn("rounded-full px-2.5 py-0.5 text-xs", tone === "wa" ? "bg-wa/20 text-wa" : tone === "warn" ? "bg-warn/25 text-amber-200" : "bg-white/10 text-mute")}>{children}</span>);
