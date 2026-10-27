import { cn } from "@/lib/utils/cn";
const base = "w-full rounded-xl border border-line bg-black/25 px-3 py-2 text-sm outline-none focus:border-wa placeholder:text-mute/60";
export const Input = (p) => <input {...p} className={cn(base, p.className)}/>;
export const Textarea = (p) => <textarea {...p} className={cn(base, "min-h-28 leading-7", p.className)}/>;
export const Select = (p) => <select {...p} className={cn(base, p.className)}/>;
