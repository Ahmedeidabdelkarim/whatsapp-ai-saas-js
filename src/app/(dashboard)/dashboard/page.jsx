import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Funnel } from "@/components/dashboard/funnel";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { AbandonedCard } from "@/components/dashboard/abandoned-card";
import { Pill } from "@/components/ui/badge";
import { getStore } from "@/lib/tenant/get-tenant";
import { getFunnel, getKpis } from "@/server/analytics";
export default async function Page() {
    const store = await getStore();
    const [f, k] = await Promise.all([getFunnel(store.id), getKpis(store.id)]);
    return (<>
      <PageHeader eyebrow="تحليلات وإدارة العملاء" title="اعرف مين اشترى... ومين تردّد"/>
      <KpiGrid k={k}/>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="قمع المبيعات · هذا الشهر">
          <Funnel leads={f.leads} active={f.active} orders={f.orders}/>
          <p className="mb-2 mt-6 text-sm text-mute">الأكثر طلباً في المحادثات</p>
          <div className="flex flex-wrap gap-2">
            {k.mostRequested.length ? k.mostRequested.map((t) => <Pill key={t.name} tone="wa">{t.name} · {t.count}</Pill>) : <span className="text-sm text-mute">لا توجد بيانات بعد</span>}
          </div>
        </Card>
        <Card title="عملاء توقفوا في منتصف المحادثة"><AbandonedCard count={f.abandoned}/></Card>
      </div>
    </>);
}
