import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StagePill, StatusPill } from "@/components/dashboard/stage-pill";
import { getStore } from "@/lib/tenant/get-tenant";
import { listConversations } from "@/server/conversations";
function Row({ c }) {
    return (<li>
      <Link href={`/dashboard/conversations/${c.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-white/5">
        <div className="min-w-0"><p className="font-semibold">{c.customer.name ?? `+${c.customer.waId}`}</p><p className="truncate text-sm text-mute">{c.messages[0]?.body}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-1"><StatusPill status={c.status}/><StagePill stage={c.stage}/></div>
      </Link>
    </li>);
}
export default async function Page() {
    const store = await getStore();
    const all = await listConversations(store.id);
    const queue = all.filter((c) => c.status === "HANDOFF").sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()); // longest-waiting first
    const rest = all.filter((c) => c.status !== "HANDOFF");
    return (<>
      <PageHeader title="المحادثات"/>
      <div className="space-y-4">
        <Card title={`قائمة انتظار الموظفين (${queue.length})`}>
          {queue.length ? <ul className="divide-y divide-line/60">{queue.map((c) => <Row key={c.id} c={c}/>)}</ul> : <p className="py-2 text-sm text-mute">لا أحد ينتظر موظفاً الآن 👍</p>}
        </Card>
        <Card title="كل المحادثات">
          <ul className="divide-y divide-line/60">{rest.map((c) => <Row key={c.id} c={c}/>)}</ul>
          {rest.length === 0 && <p className="py-6 text-center text-mute">لا توجد محادثات بعد</p>}
        </Card>
      </div>
    </>);
}
