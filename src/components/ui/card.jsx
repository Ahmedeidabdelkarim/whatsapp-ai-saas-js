import { cn } from "@/lib/utils/cn";
export function Card({ title, className, children, action }) {
    return (<section className={cn("rounded-2xl border border-line bg-panel/70 backdrop-blur p-5", className)}>
      {(title || action) && (<header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><span className="size-1.5 rounded-full bg-wa"/>{title}</h2>
          {action}
        </header>)}
      {children}
    </section>);
}
