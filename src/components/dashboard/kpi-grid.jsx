import { num } from "@/lib/utils/format";
export function KpiGrid({ k }) {
    const items = [
        ["إجمالي العملاء", num(k.totalCustomers)], ["استفسارات المنتجات", num(k.productInquiries)], ["أضيف للسلة", num(k.addedToCart)],
        ["السلات المتروكة", num(k.abandoned), k.abandoned > 0], ["الطلبات المكتملة", num(k.completed)], ["طلبات الموظف", num(k.humanRequests), k.humanRequests > 0],
        ["المحادثات النشطة", num(k.activeConversations)], ["نسبة التحويل", `${k.conversionRate}%`],
    ];
    return (<div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([label, v, warn]) => (<div key={label} className="rounded-2xl border border-line bg-panel/70 p-4">
          <p className="text-xs text-mute">{label}</p><p className={`mt-1 text-3xl font-bold ${warn ? "text-amber-200" : "text-wa"}`}>{v}</p>
        </div>))}
    </div>);
}
