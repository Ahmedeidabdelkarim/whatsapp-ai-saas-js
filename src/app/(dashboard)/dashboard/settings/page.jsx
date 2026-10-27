import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/badge";
import { getStore } from "@/lib/tenant/get-tenant";
import { saveGatewayAction } from "@/server/settings-actions";
export default async function Page() {
    const store = await getStore();
    return (<>
      <PageHeader title="الإعدادات"/>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="بيانات المتجر"><dl className="space-y-2 text-sm"><div><dt className="text-mute">الاسم</dt><dd>{store.name}</dd></div><div><dt className="text-mute">المعرّف</dt><dd dir="ltr" className="text-start">{store.slug}</dd></div><div><dt className="text-mute">العملة</dt><dd>{store.currency}</dd></div></dl></Card>
        <Card title="الدفع الإلكتروني (Moyasar)" action={<Pill tone={store.moyasarSecretKey ? "wa" : "warn"}>{store.moyasarSecretKey ? "مفعّل" : "غير مفعّل"}</Pill>}>
          <p className="mb-3 text-sm text-mute">ضع المفتاح السري (sk_...) من حسابك في Moyasar. يرسل البوت للعميل رابط دفع بعد كل طلب، والمبلغ يصل لحسابك أنت. بدونه يبقى الطلب «بانتظار الدفع» وتتواصل مع العميل بنفسك.</p>
          <form action={saveGatewayAction} className="space-y-3">
            <Input name="moyasarSecretKey" dir="ltr" type="password" placeholder={store.moyasarSecretKey ? "•••••• (اتركه فارغاً للإبقاء عليه)" : "sk_test_..."}/>
            {store.moyasarSecretKey && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove" className="accent-[#25d366]"/>حذف المفتاح</label>}
            <Button>حفظ</Button>
          </form>
        </Card>
      </div>
    </>);
}
