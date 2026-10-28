import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";

const paymentStatus = {
    paid: { label: "مدفوع", className: "bg-wa/10 text-wa" },
    pending: { label: "بانتظار الدفع", className: "bg-amber-400/10 text-amber-300" },
    failed: { label: "فشل", className: "bg-red-400/10 text-red-300" },
};

const money = (halalas) => `${(halalas / 100).toLocaleString("en-US")} ر.س`;

export default async function Page() {
    const [rows, totalCount, paidCount, pendingCount, revenue] = await Promise.all([
        prisma.payment.findMany({
            include: { subscription: { include: { store: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        }),
        prisma.payment.count(),
        prisma.payment.count({ where: { status: "paid" } }),
        prisma.payment.count({ where: { status: "pending" } }),
        prisma.payment.aggregate({ where: { status: "paid" }, _sum: { amountHalalas: true } }),
    ]);

    return (<>
      <PageHeader eyebrow="إدارة المنصة" title="المدفوعات">
        <span className="rounded-full border border-line bg-panel/70 px-3 py-1.5 text-sm text-mute">{totalCount.toLocaleString("ar-SA")} عملية</span>
      </PageHeader>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-mute">إجمالي العمليات</p><p className="mt-1 text-2xl font-bold">{totalCount.toLocaleString("ar-SA")}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">مدفوع</p><p className="mt-1 text-2xl font-bold text-wa">{paidCount.toLocaleString("ar-SA")}</p><p className="mt-1 text-xs text-mute">{money(revenue._sum.amountHalalas ?? 0)}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">بانتظار الدفع</p><p className="mt-1 text-2xl font-bold text-amber-300">{pendingCount.toLocaleString("ar-SA")}</p></Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line/60 px-5 py-4">
          <h2 className="font-semibold">سجل المدفوعات</h2>
          <p className="mt-1 text-xs text-mute">أحدث 200 عملية دفع على المنصة</p>
        </div>
        <div className="px-5 py-2">
          <DataTable head={["المتجر", "المرجع", "المبلغ", "الحالة", "التاريخ"]}>
            {rows.map((payment) => {
                const status = paymentStatus[payment.status] ?? { label: payment.status, className: "bg-white/5 text-mute" };
                return <tr key={payment.id}>
                  <td className="whitespace-nowrap font-medium">{payment.subscription.store.name}</td>
                  <td dir="ltr" className="max-w-48 truncate text-end font-mono text-xs text-mute">{payment.gatewayRef}</td>
                  <td className="whitespace-nowrap font-semibold">{money(payment.amountHalalas)}</td>
                  <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span></td>
                  <td className="whitespace-nowrap text-mute">{payment.createdAt.toLocaleDateString("ar-SA")}</td>
                </tr>;
            })}
          </DataTable>
          {rows.length === 0 && <p className="py-10 text-center text-sm text-mute">لا توجد مدفوعات حتى الآن</p>}
        </div>
      </Card>
    </>);
}
