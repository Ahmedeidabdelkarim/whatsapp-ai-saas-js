import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
export default async function Page() {
    const rows = await prisma.store.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return (<><PageHeader title="المتاجر"/><Card><DataTable head={["المتجر", "الرقم", "واتساب", "تاريخ الإنشاء"]}>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td dir="ltr" className="text-mute">{r.slug}</td><td>{r.waPhoneNumberId ? "مربوط" : "—"}</td><td className="text-mute">{r.createdAt.toLocaleDateString("ar-SA")}</td></tr>)}</DataTable></Card></>);
}
