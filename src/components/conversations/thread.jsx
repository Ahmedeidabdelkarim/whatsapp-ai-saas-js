import { cn } from "@/lib/utils/cn";
import { ScrollEnd } from "./scroll-end";
export function Thread({ messages }) {
    return (<div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto rounded-xl bg-[#ece5dd] p-4 text-black">
      {messages.map((m) => (<div key={m.id} className={cn("max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm shadow-sm", m.direction === "IN" ? "self-start bg-[#dcf8c6]" : m.sender === "STAFF" ? "self-end bg-[#cfe9ff]" : "self-end bg-white")}>
          {m.direction === "OUT" && <div className="mb-0.5 text-[10px] font-semibold text-black/50">{m.sender === "STAFF" ? "موظف" : "AI"}</div>}
          {m.body}<div className="mt-1 text-[10px] text-black/40">{m.createdAt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>))}
      <ScrollEnd count={messages.length}/>
    </div>);
}
