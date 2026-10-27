import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Textarea, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStore } from "@/lib/tenant/get-tenant";
import { saveAiAction } from "@/server/settings-actions";
export default async function Page() {
    const store = await getStore();
    return (<>
      <PageHeader eyebrow="المساعد الذكي" title="شخصية البوت (AI Persona)"/>
      <form action={saveAiAction} className="grid gap-4 lg:grid-cols-2">
        <Card title="شخصية البوت (AI Persona)">
          <Textarea name="aiPersona" defaultValue={store.aiPersona}/>
          <p className="mt-2 text-xs text-mute">القواعد الأساسية (الرد من الكتالوج فقط وعدم اختلاق الأسعار) مفروضة دائماً حتى لو غيّرت الشخصية.</p>
        </Card>
        <Card title="رسالة الترحيب">
          <Input name="greeting" defaultValue={store.greeting}/>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="aiEnabled" defaultChecked={store.aiEnabled} className="accent-[#25d366]"/>تفعيل الرد الآلي</label>
        </Card>
        <div className="lg:col-span-2"><Button>حفظ</Button></div>
      </form>
    </>);
}
