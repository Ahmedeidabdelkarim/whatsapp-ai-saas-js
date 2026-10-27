import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { getStore } from "@/lib/tenant/get-tenant";
import { getLimits } from "@/lib/billing/limits";
import { prisma } from "@/lib/db/prisma";
import { sar } from "@/lib/utils/format";
import { checkoutPlanAction } from "@/server/billing/actions";
const FEATURES = {
    starter: ["استخدام AI محدود (~1,200 توكن/جلسة)"],
    growth: ["استخدام AI قياسي", "دعم الصوت"],
    pro: ["استخدام AI مرتفع", "دعم الصوت", "CRM كامل"],
};
const ERRORS = {
    gateway: "تعذّر الاتصال ببوابة الدفع. تأكد من MOYASAR_SECRET_KEY أو حاول لاحقاً.",
    rate: "محاولات كثيرة، انتظر دقيقة.", plan: "الباقة غير صالحة للشراء.",
};
const lim = (n) => (n >= 100_000 ? "غير محدود" : n.toLocaleString("en-US"));
export default async function Page({ searchParams }) {
    const { paid, error } = await searchParams;
    const store = await getStore();
    const [{ plan, sub, active }, plans, payments] = await Promise.all([
        getLimits(store.id),
        prisma.plan.findMany({ where: { priceHalalas: { gt: 0 } }, orderBy: { priceHalalas: "asc" } }),
        prisma.payment.findMany({ where: { subscription: { storeId: store.id } }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return (<>
      <PageHeader title="الاشتراك"/>
      {paid && <p className="mb-4 rounded-xl bg-wa/15 p-3 text-sm text-wa">شكراً! إذا اكتمل الدفع سيتفعّل اشتراكك خلال لحظات (حدّث الصفحة).</p>}
      {error && <p className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{ERRORS[error] ?? "حدث خطأ"}</p>}
      <Card title="باقتك الحالية" action={<Pill tone={active ? "wa" : "warn"}>{active ? "فعّال" : "منتهي"}</Pill>}>
        <p className="text-xl font-bold">{plan?.name}</p>
        <p className="text-mute">ينتهي في {sub?.currentPeriodEnd.toLocaleDateString("ar-SA")}</p>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (<Card key={p.id} title={p.name}>
            <p className="text-2xl font-bold">{sar(p.priceHalalas)}<span className="text-sm text-mute"> /شهر</span></p>
            <ul className="mt-3 space-y-1 text-sm text-mute">
              <li>{lim(p.maxProducts)} منتج</li><li>{lim(p.maxConversationsPerMonth)}{p.maxConversationsPerMonth >= 20_000 ? "+" : ""} محادثة/شهر</li>
              {(FEATURES[p.key] ?? []).map((f) => <li key={f}>{f}</li>)}
            </ul>
            <form action={checkoutPlanAction} className="mt-4"><input type="hidden" name="plan" value={p.key}/>
              <Button className="w-full" variant={plan?.id === p.id && active ? "ghost" : "primary"}>{plan?.id === p.id && active ? "تجديد 30 يوم" : "اشترك الآن"}</Button></form>
          </Card>))}
      </div>
      {payments.length > 0 && (<Card title="آخر المدفوعات" className="mt-4">
          <DataTable head={["التاريخ", "المبلغ", "الحالة"]}>
            {payments.map((x) => <tr key={x.id}><td className="text-mute">{x.createdAt.toLocaleDateString("ar-SA")}</td><td>{sar(x.amountHalalas)}</td><td>{x.status === "paid" ? "مدفوع" : x.status === "pending" ? "بانتظار الدفع" : x.status}</td></tr>)}
          </DataTable>
        </Card>)}
    </>);
}
