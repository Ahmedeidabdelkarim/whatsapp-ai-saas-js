import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Funnel } from "@/components/dashboard/funnel";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { getStore } from "@/lib/tenant/get-tenant";
import { getFunnel, getKpis, getStageBreakdown } from "@/server/analytics";
import { STAGE_LABEL } from "@/lib/crm/stage";
export default async function Page() {
    const store = await getStore();
    let data;
    try {
        data = await Promise.all([getFunnel(store.id), getKpis(store.id), getStageBreakdown(store.id)]);
    }
    catch (error) {
        if (error?.code !== "P1001")
            throw error;
        console.error("[analytics] database server is unreachable:", error.message);
        return (<>
          <PageHeader title="التحليلات"/>
          <Card title="تعذّر تحميل التحليلات">
            <p className="text-sm leading-7 text-mute">تعذّر الاتصال بقاعدة البيانات حالياً، لذلك لم نعرض بيانات قديمة أو غير دقيقة. تحقّق من حالة قاعدة Neon وإعداد DATABASE_URL، ثم أعد المحاولة.</p>
            <a href="/dashboard/analytics" className="mt-4 inline-flex rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-bg">إعادة المحاولة</a>
          </Card>
        </>);
    }
    const [f, k, stages] = data;
    const max = Math.max(1, ...Object.values(stages).map((n) => n ?? 0));
    return (<>
      <PageHeader title="التحليلات"/>
      <KpiGrid k={k}/>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="قمع المبيعات · هذا الشهر"><Funnel leads={f.leads} active={f.active} orders={f.orders}/></Card>
        <Card title="حالات العملاء الآن">
          <ul className="space-y-3">
            {Object.keys(STAGE_LABEL).map((s) => (<li key={s}>
                <div className="mb-1 flex justify-between text-sm"><span>{STAGE_LABEL[s]}</span><span className="text-mute">{stages[s] ?? 0}</span></div>
                <div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-wa" style={{ width: `${((stages[s] ?? 0) / max) * 100}%` }}/></div>
              </li>))}
          </ul>
        </Card>
        <Card title="الأكثر طلباً"><ul className="space-y-2 text-sm">{k.mostRequested.map((t) => <li key={t.name} className="flex justify-between"><span>{t.name}</span><span className="text-mute">{t.count}</span></li>)}{k.mostRequested.length === 0 && <li className="text-mute">لا توجد بيانات بعد</li>}</ul></Card>
      </div>
    </>);
}
