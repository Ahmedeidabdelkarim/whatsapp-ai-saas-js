import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return (<><PageHeader title="المستخدمون"/><Card><DataTable head={["الاسم", "البريد", "الدور"]}>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td dir="ltr" className="text-start text-mute">{r.email}</td><td>{r.role}</td></tr>)}</DataTable></Card></>);
}
