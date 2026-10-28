import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/db/prisma";
import { createPlanAction, updatePlanAction } from "@/server/admin-actions";

function PlanFields({ plan }) {
    return <>
      {plan && <input type="hidden" name="id" value={plan.id}/>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-sm text-mute">اسم الباقة
          <Input name="name" defaultValue={plan?.name ?? ""} required minLength={2} maxLength={80}/>
        </label>
        <label className="space-y-1.5 text-sm text-mute">السعر (ر.س)
          <Input name="price" type="number" min="0" max="1000000" step="0.01" defaultValue={plan ? plan.priceHalalas / 100 : 0} required/>
        </label>
        <label className="space-y-1.5 text-sm text-mute">حد المنتجات
          <Input name="maxProducts" type="number" min="1" defaultValue={plan?.maxProducts ?? 50} required/>
        </label>
        <label className="space-y-1.5 text-sm text-mute">حد المحادثات شهريًا
          <Input name="maxConversationsPerMonth" type="number" min="1" defaultValue={plan?.maxConversationsPerMonth ?? 500} required/>
        </label>
        <label className="space-y-1.5 text-sm text-mute">ميزانية الذكاء الاصطناعي للجلسة
          <Input name="aiSessionTokens" type="number" min="1" defaultValue={plan?.aiSessionTokens ?? 4000} required/>
        </label>
        <div className="flex flex-wrap items-center gap-4 self-end pb-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="voiceSupport" defaultChecked={plan?.voiceSupport ?? false} className="accent-[var(--color-wa)]"/>دعم الرسائل الصوتية</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="crmFull" defaultChecked={plan?.crmFull ?? false} className="accent-[var(--color-wa)]"/>ملف العميل الكامل</label>
        </div>
      </div>
    </>;
}

export default async function Page() {
    const plans = await prisma.plan.findMany({ orderBy: { priceHalalas: "asc" } });
    return (<>
      <PageHeader title="إدارة الباقات"/>
      <div className="space-y-4">
        {plans.map((plan) => <Card key={plan.id} title={`${plan.name} · ${plan.key}`}>
          <form action={updatePlanAction} className="space-y-4">
            <PlanFields plan={plan}/>
            <div className="flex justify-end"><SubmitButton variant="ghost">حفظ التعديلات</SubmitButton></div>
          </form>
        </Card>)}
        <Card title="إنشاء باقة جديدة">
          <form action={createPlanAction} className="space-y-4">
            <label className="block max-w-sm space-y-1.5 text-sm text-mute">مفتاح الباقة (أحرف إنجليزية صغيرة وأرقام وشرطة)
              <Input name="key" dir="ltr" pattern="[a-z0-9-]+" minLength={2} maxLength={40} required/>
            </label>
            <PlanFields/>
            <div className="flex justify-end"><SubmitButton pendingText="جارٍ إنشاء الباقة...">إنشاء الباقة</SubmitButton></div>
          </form>
        </Card>
      </div>
    </>);
}
