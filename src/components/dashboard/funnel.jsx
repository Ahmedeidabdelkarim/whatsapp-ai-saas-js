import { num } from "@/lib/utils/format";
export function Funnel({ leads, active, orders }) {
    const rows = [
        ["عملاء محتملون", leads, "bg-wa text-bg", "100%"],
        ["محادثات نشطة", active, "bg-emerald-300 text-bg", "75%"],
        ["طلبات مكتملة", orders, "bg-emerald-100 text-bg", "55%"],
    ];
    return (<div className="space-y-3">
      {rows.map(([label, v, cls, w]) => (<div key={label} className={`flex items-center justify-between rounded-xl px-4 py-3 font-semibold ${cls}`} style={{ width: w }}>
          <span>{label}</span><span>{num(v)}</span>
        </div>))}
    </div>);
}
