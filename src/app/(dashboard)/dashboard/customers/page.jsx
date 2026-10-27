import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { StagePill } from "@/components/dashboard/stage-pill";
import { getStore } from "@/lib/tenant/get-tenant";
import { listCustomers } from "@/server/customers";
export default async function Page() {
    const store = await getStore();
    const customers = await listCustomers(store.id);
    return (<>
      <PageHeader title="العملاء"/>
      <Card>
        <DataTable head={["العميل", "الجوال", "الحالة", "آخر تواصل", "الطلبات"]}>
          {customers.map((c) => {
            const last = c.conversations[0];
            return (<tr key={c.id}>
                <td><Link href={`/dashboard/customers/${c.id}`} className="font-semibold text-wa hover:underline">{c.name ?? "—"}</Link></td>
                <td dir="ltr" className="text-start text-mute">+{c.waId}</td>
                <td>{last ? <StagePill stage={last.stage}/> : "—"}</td>
                <td className="text-mute">{last ? last.lastMessageAt.toLocaleString("ar-SA") : "—"}</td>
                <td>{c._count.orders}</td>
              </tr>);
        })}
        </DataTable>
      </Card>
    </>);
}
