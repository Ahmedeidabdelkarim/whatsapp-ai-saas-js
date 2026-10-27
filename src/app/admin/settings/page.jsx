import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.plan.findMany({ orderBy: { priceHalalas: "asc" } });
    return (<><PageHeader title="إعدادات المنصة"/><Card><DataTable head={["الباقة", "السعر (ر.س)", "حد المنتجات", "حد المحادثات"]}>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.priceHalalas / 100}</td><td>{r.maxProducts}</td><td>{r.maxConversationsPerMonth}</td></tr>)}</DataTable></Card></>);
}
