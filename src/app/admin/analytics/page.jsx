import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.store.findMany({ include: { _count: { select: { conversations: true, orders: true } } }, orderBy: { name: "asc" } });
    return (<><PageHeader title="تحليلات المنصة"/><Card><DataTable head={["المتجر", "محادثات", "طلبات"]}>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r._count.conversations}</td><td>{r._count.orders}</td></tr>)}</DataTable></Card></>);
}
