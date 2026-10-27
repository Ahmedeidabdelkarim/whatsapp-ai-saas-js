import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return (<><PageHeader title="المدفوعات"/><Card><DataTable head={["المرجع", "المبلغ (ر.س)", "الحالة", "التاريخ"]}>{rows.map((r) => <tr key={r.id}><td dir="ltr" className="text-mute">{r.gatewayRef}</td><td>{(r.amountHalalas / 100).toLocaleString("en-US")}</td><td>{r.status}</td><td className="text-mute">{r.createdAt.toLocaleDateString("ar-SA")}</td></tr>)}</DataTable></Card></>);
}
