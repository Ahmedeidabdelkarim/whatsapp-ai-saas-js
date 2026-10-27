import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { startOfMonth } from "@/lib/utils/format";
export default async function Page() {
    const [stores, users, active, paid, convs] = await Promise.all([
        prisma.store.count(), prisma.user.count(), prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.payment.aggregate({ where: { status: "paid", createdAt: { gte: startOfMonth() } }, _sum: { amountHalalas: true } }),
        prisma.conversation.count({ where: { createdAt: { gte: startOfMonth() } } }),
    ]);
    const stats = [["المتاجر", stores], ["المستخدمون", users], ["اشتراكات مدفوعة", active], ["محادثات الشهر", convs], ["إيراد الشهر (ر.س)", ((paid._sum.amountHalalas ?? 0) / 100).toLocaleString("en-US")]];
    return (<><PageHeader title="لوحة المشرف"/><div className="grid gap-4 md:grid-cols-5">{stats.map(([l, v]) => <Card key={l}><p className="text-sm text-mute">{l}</p><p className="mt-1 text-3xl font-bold text-wa">{v}</p></Card>)}</div></>);
}
