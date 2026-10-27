import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.subscription.findMany({ include: { store: true, plan: true }, take: 200 });
    return (<><PageHeader title="الاشتراكات"/><Card><DataTable head={["المتجر", "الباقة", "الحالة", "ينتهي"]}>{rows.map((r) => <tr key={r.id}><td>{r.store.name}</td><td>{r.plan.name}</td><td>{r.status}</td><td className="text-mute">{r.currentPeriodEnd.toLocaleDateString("ar-SA")}</td></tr>)}</DataTable></Card></>);
}
