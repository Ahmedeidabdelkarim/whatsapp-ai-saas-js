import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStore } from "@/lib/tenant/get-tenant";
import { listOrders } from "@/server/orders";
import { orderStatusAction } from "@/server/settings-actions";
import { sar } from "@/lib/utils/format";
const labels = { PENDING: "بانتظار الدفع", PAID: "مدفوع", FULFILLED: "تم التسليم", CANCELED: "ملغي" };
export default async function Page() {
    const store = await getStore();
    const orders = await listOrders(store.id);
    return (<>
      <PageHeader eyebrow="إدارة المتجر" title="الطلبات">
        <span className="rounded-full border border-line bg-panel/70 px-3 py-1.5 text-sm text-mute">{orders.length} طلب</span>
      </PageHeader>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div>
            <h2 className="font-semibold">سجل الطلبات</h2>
            <p className="mt-1 text-xs text-mute">راجع تفاصيل الطلبات وحدّث حالتها</p>
          </div>
          <span className="rounded-lg bg-wa/10 px-2.5 py-1 text-xs font-medium text-wa">الأحدث أولاً</span>
        </div>
        <div className="[&_td]:px-5 [&_th]:px-5 [&_th]:pt-4 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-white/[0.03]">
        <DataTable head={["الطلب", "التاريخ", "العميل", "المنتجات", "الإجمالي", "الحالة"]}>
          {orders.map((o) => (<tr key={o.id}>
              <td dir="ltr" className="whitespace-nowrap text-end"><span className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-mute">#{o.id.slice(-6).toUpperCase()}</span></td>
              <td className="whitespace-nowrap text-mute"><span>{o.createdAt.toLocaleDateString("ar-SA")}</span><span className="mt-1 block text-xs text-mute/70">{o.createdAt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span></td>
              <td className="min-w-36 font-medium">{o.customer.name ?? o.customer.waId}</td>
              <td className="max-w-64 text-mute">{o.items.map((i) => `${i.product?.name ?? i.productName ?? "منتج محذوف"} ×${i.quantity}`).join("، ")}</td>
              <td className="whitespace-nowrap font-semibold">{sar(o.totalHalalas)}</td>
              <td>
                <form action={orderStatusAction} className="flex min-w-56 items-center gap-2"><input type="hidden" name="id" value={o.id}/>
                  <Select name="status" defaultValue={o.status} className="min-w-0 flex-1">{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Button variant="ghost" className="px-3">حفظ</Button></form>
              </td>
            </tr>))}
        </DataTable>
        </div>
        {orders.length === 0 && <div className="border-t border-line/60 px-5 py-12 text-center">
          <p className="font-medium">لا توجد طلبات بعد</p>
          <p className="mt-1 text-sm text-mute">ستظهر الطلبات الجديدة هنا عند استلامها</p>
        </div>}
      </Card>
    </>);
}
