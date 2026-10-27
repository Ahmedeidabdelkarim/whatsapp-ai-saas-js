import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { StagePill, StatusPill } from "@/components/dashboard/stage-pill";
import { getStore } from "@/lib/tenant/get-tenant";
import { getEntitlements } from "@/lib/billing/limits";
import { getCustomerProfile } from "@/server/customers";
import { EVENT_LABEL } from "@/lib/crm/stage";
import { sar } from "@/lib/utils/format";
const ORDER = { PENDING: "بانتظار الدفع", PAID: "مدفوع", FULFILLED: "تم التسليم", CANCELED: "ملغي" };
export default async function Page({ params }) {
    const { id } = await params;
    const store = await getStore();
    const ent = await getEntitlements(store.id);
    if (!ent.crmFull)
        return (<><PageHeader title="ملف العميل"/><Card><p className="text-mute">ملف العميل الكامل (السجل، الاهتمامات، الطلبات) متاح في باقة Diamond. <Link href="/dashboard/billing" className="text-wa">ترقية الباقة</Link></p></Card></>);
    const data = await getCustomerProfile(store.id, id);
    if (!data)
        return notFound();
    const { customer: c, asked, humanRequested } = data;
    const latest = c.conversations[0];
    const cart = c.conversations.find((x) => x.cart?.items.length)?.cart;
    return (<>
      <PageHeader eyebrow="ملف العميل" title={c.name ?? `+${c.waId}`}>
        <div className="flex items-center gap-2">{latest && <><StagePill stage={latest.stage}/><StatusPill status={latest.status}/></>}{humanRequested && <Pill tone="warn">طلب موظفاً</Pill>}</div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="معلومات">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-mute">الجوال</dt><dd dir="ltr" className="text-start">+{c.waId}</dd></div>
            <div><dt className="text-mute">آخر تواصل</dt><dd>{latest?.lastMessageAt.toLocaleString("ar-SA") ?? "—"}</dd></div>
            <div><dt className="text-mute">المحادثة</dt><dd>{latest ? <Link className="text-wa" href={`/dashboard/conversations/${latest.id}`}>فتح المحادثة السابقة ↗</Link> : "—"}</dd></div>
          </dl>
        </Card>
        <Card title="المنتجات التي سأل عنها">
          {asked.length ? <div className="flex flex-wrap gap-2">{asked.map((a) => <Pill key={a.name} tone="wa">{a.name} · {a.n}</Pill>)}</div> : <p className="text-sm text-mute">لا شيء بعد</p>}
        </Card>
        <Card title="السلة الحالية">
          {cart?.items.length ? <ul className="space-y-1 text-sm">{cart.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.product.name} ×{i.quantity}</span><span className="text-mute">{sar(i.quantity * i.product.priceHalalas)}</span></li>)}</ul> : <p className="text-sm text-mute">السلة فارغة</p>}
        </Card>
        <Card title="الطلبات">
          {c.orders.length ? <ul className="space-y-2 text-sm">{c.orders.map((o) => <li key={o.id} className="flex justify-between"><span>#{o.id.slice(-6).toUpperCase()} · {o.items.map((i) => i.product.name).join("، ")}</span><span className="text-mute">{sar(o.totalHalalas)} · {ORDER[o.status]}</span></li>)}</ul> : <p className="text-sm text-mute">لا توجد طلبات</p>}
        </Card>
        <Card title="السجل الزمني" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {c.events.map((e) => <li key={e.id} className="flex justify-between border-b border-line/50 pb-2"><span>{EVENT_LABEL[e.type] ?? e.type}{e.productId ? ` · ${data.names.get(e.productId) ?? ""}` : ""}</span><span className="text-mute">{e.createdAt.toLocaleString("ar-SA")}</span></li>)}
            {c.events.length === 0 && <li className="text-mute">لا أحداث بعد</li>}
          </ul>
        </Card>
      </div>
    </>);
}
