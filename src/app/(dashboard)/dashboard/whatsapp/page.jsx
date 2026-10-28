import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/badge";
import { WelcomeUploader } from "@/components/whatsapp/welcome-uploader";
import { TemplateCard } from "@/components/whatsapp/template-card";
import { AiTest } from "@/components/whatsapp/ai-test";
import { getStore } from "@/lib/tenant/get-tenant";
import { getWaCreds } from "@/lib/whatsapp/creds";
import { getTemplateStatus } from "@/lib/whatsapp/templates";
import { getDiagnostics } from "@/server/diagnostics";
import { prisma } from "@/lib/db/prisma";
import { saveWhatsappAction } from "@/server/settings-actions";
export default async function Page() {
    let store;
    let assets = {};
    let diag = { checks: [], failed: [] };
    let tplStatus = null;
    let dbError = null;
    try {
        store = await getStore();
        const creds = getWaCreds(store);
        const [assetRows, d, status] = await Promise.all([
            prisma.welcomeAsset.findMany({ where: { storeId: store.id } }),
            getDiagnostics(store),
            creds && store.waBusinessId ? getTemplateStatus(store.waBusinessId, creds.accessToken) : Promise.resolve(null),
        ]);
        assets = Object.fromEntries(assetRows.map((a) => [a.kind, a.url]));
        diag = d;
        tplStatus = status;
    }
    catch (e) {
        dbError = e instanceof Error ? e.message : String(e);
        console.error("[dashboard/whatsapp] failed to load WhatsApp page:", dbError);
    }
    const creds = store ? getWaCreds(store) : null;
    const webhook = `${process.env.APP_URL}/api/webhooks/whatsapp`;
    if (!store) {
        return (<>
          <PageHeader eyebrow="تجربة العميل على واتساب" title="واتساب وباقة الترحيب"/>
          <Card title="حالة قاعدة البيانات">
            <p className="text-sm text-red-300">تعذّر تحميل صفحة واتساب حالياً لأن قاعدة البيانات غير متاحة.</p>
            <p className="mt-2 text-xs text-mute" dir="ltr">{dbError ?? "يرجى التحقق من اتصال Neon/Postgres."}</p>
          </Card>
        </>);
    }
    return (<>
      <PageHeader eyebrow="تجربة العميل على واتساب" title="واتساب وباقة الترحيب"/>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="ربط رقم واتساب (Cloud API)" action={<Pill tone={creds ? "wa" : "warn"}>{creds ? "مربوط" : "غير مربوط"}</Pill>}>
          <form action={saveWhatsappAction} className="space-y-3">
            <Input name="waPhoneNumberId" dir="ltr" placeholder="Phone number ID" defaultValue={store.waPhoneNumberId ?? ""}/>
            <Input name="waBusinessId" dir="ltr" placeholder="WhatsApp Business Account ID" defaultValue={store.waBusinessId ?? ""}/>
            <Input name="waAccessToken" dir="ltr" type="password" placeholder={store.waAccessToken ? "•••••• (اتركه فارغاً للإبقاء عليه)" : "Access token"}/>
            <Button>حفظ</Button>
          </form>
          <p className="mt-4 text-xs text-mute">Webhook URL في Meta: <code dir="ltr" className="text-wa">{webhook}</code> واشترك في حقل messages. التوكن يُحفظ مشفّراً.</p>
        </Card>

        <Card title="لماذا لا يرد البوت؟ (فحص سريع)">
          <ul className="space-y-2 text-sm">
            {diag.checks.map((c) => (<li key={c.label} className="flex items-start gap-2">
                <span className={c.ok ? "text-wa" : "text-red-300"}>{c.ok ? "✓" : "✗"}</span>
                <span>{c.label}{!c.ok && <span className="block text-xs text-mute">{c.hint}</span>}</span>
              </li>))}
          </ul>
          {diag.failed.length > 0 && (<div className="mt-4 rounded-xl bg-black/25 p-3 text-xs text-mute">
              <p className="mb-1 font-semibold text-amber-200">آخر الأخطاء</p>
              {diag.failed.map((j) => <p key={j.id} dir="ltr" className="truncate text-start">{j.lastError}</p>)}
            </div>)}
          <AiTest lastError={store.lastAiError} lastErrorAt={store.lastAiErrorAt}/>
        </Card>

        <Card title="باقة الترحيب التلقائية"><WelcomeUploader assets={assets}/></Card>
        <Card title="قالب حملة المتابعة"><TemplateCard status={tplStatus} connected={!!creds && !!store.waBusinessId}/></Card>
      </div>
    </>);
}
