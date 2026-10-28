import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { updateStoreAction } from "@/server/admin-actions";
export default async function Page() {
    const rows = await prisma.store.findMany({ orderBy: { createdAt: "desc" } });
    const activeCount = rows.filter((store) => store.isActive).length;
    return (<>
      <PageHeader eyebrow="إدارة المنصة" title="المتاجر">
        <span className="rounded-full border border-line bg-panel/70 px-3 py-1.5 text-sm text-mute">{rows.length.toLocaleString("ar-SA")} متجر</span>
      </PageHeader>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card className="p-4"><p className="text-sm text-mute">جميع المتاجر</p><p className="mt-1 text-2xl font-bold">{rows.length.toLocaleString("ar-SA")}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">المتاجر النشطة</p><p className="mt-1 text-2xl font-bold text-wa">{activeCount.toLocaleString("ar-SA")}</p></Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line/60 px-5 py-4">
          <h2 className="font-semibold">دليل المتاجر</h2>
          <p className="mt-1 text-xs text-mute">عدّل بيانات المتجر أو أوقفه مؤقتًا مع الاحتفاظ ببياناته</p>
        </div>
        <div className="p-4">
          {rows.length > 0 ? <DataTable head={["المتجر", "المعرّف", "اتصال واتساب", "حالة المتجر", "تاريخ الإنشاء", ""]}>
            {rows.map((store) => {
                const formId = `store-${store.id}`;
                return <tr key={store.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="min-w-52 px-3">
                    <Input form={formId} name="name" aria-label="اسم المتجر" defaultValue={store.name} required minLength={2} className="min-w-44 bg-black/20"/>
                  </td>
                  <td className="min-w-48 px-3">
                    <Input form={formId} name="slug" aria-label="معرّف المتجر" defaultValue={store.slug} dir="ltr" required minLength={2} className="min-w-40 bg-black/20 text-start font-mono text-xs"/>
                  </td>
                  <td className="whitespace-nowrap px-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${store.waPhoneNumberId ? "bg-wa/10 text-wa" : "bg-white/5 text-mute"}`}>
                      <span className={`size-1.5 rounded-full ${store.waPhoneNumberId ? "bg-wa" : "bg-mute/50"}`}/>
                      {store.waPhoneNumberId ? "متصل" : "غير متصل"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line/70 bg-black/15 px-2.5 py-1.5 text-xs">
                      <input form={formId} type="checkbox" name="isActive" defaultChecked={store.isActive} className="size-3.5 accent-[var(--color-wa)]"/>
                      <span className={store.isActive ? "text-wa" : "text-red-300"}>{store.isActive ? "نشط" : "موقوف"}</span>
                    </label>
                  </td>
                  <td className="whitespace-nowrap px-3 text-xs text-mute">{store.createdAt.toLocaleDateString("ar-SA")}</td>
                  <td className="px-3">
                    <form id={formId} action={updateStoreAction}>
                      <input type="hidden" name="id" value={store.id}/>
                      <Button variant="ghost" className="whitespace-nowrap px-3 py-1.5 text-xs">حفظ التعديلات</Button>
                    </form>
                  </td>
                </tr>;
            })}
          </DataTable> : <p className="py-8 text-center text-sm text-mute">لا توجد متاجر حتى الآن</p>}
        </div>
      </Card>
    </>);
}
