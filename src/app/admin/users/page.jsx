import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";

const roleLabels = {
    SUPER_ADMIN: { label: "مدير المنصة", className: "bg-wa/10 text-wa" },
    OWNER: { label: "مالك متجر", className: "bg-sky-400/10 text-sky-300" },
    STAFF: { label: "موظف", className: "bg-white/5 text-mute" },
};

export default async function Page() {
    const [rows, totalCount, ownersCount, adminsCount] = await Promise.all([
        prisma.user.findMany({ include: { store: true }, orderBy: { createdAt: "desc" } }),
        prisma.user.count(),
        prisma.user.count({ where: { role: "OWNER" } }),
        prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    ]);

    return (<>
      <PageHeader eyebrow="إدارة المنصة" title="المستخدمون">
        <span className="rounded-full border border-line bg-panel/70 px-3 py-1.5 text-sm text-mute">{totalCount.toLocaleString("ar-SA")} مستخدم</span>
      </PageHeader>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-mute">جميع المستخدمين</p><p className="mt-1 text-2xl font-bold">{totalCount.toLocaleString("ar-SA")}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">أصحاب المتاجر</p><p className="mt-1 text-2xl font-bold text-sky-300">{ownersCount.toLocaleString("ar-SA")}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">مديرو المنصة</p><p className="mt-1 text-2xl font-bold text-wa">{adminsCount.toLocaleString("ar-SA")}</p></Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line/60 px-5 py-4">
          <h2 className="font-semibold">دليل المستخدمين</h2>
          <p className="mt-1 text-xs text-mute">الحسابات المسجلة والمتاجر المرتبطة بها</p>
        </div>
        <div className="px-4 py-2">
          <DataTable head={["المستخدم", "الصلاحية", "المتجر المرتبط", "تاريخ التسجيل"]}>
            {rows.map((user) => {
                const role = roleLabels[user.role] ?? { label: user.role, className: "bg-white/5 text-mute" };
                return <tr key={user.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="min-w-56 px-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line/70 bg-black/20 text-sm font-semibold text-wa">
                        {user.name.trim().charAt(0) || "؟"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{user.name}</p>
                        <p dir="ltr" className="mt-1 truncate text-start text-xs text-mute">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${role.className}`}>
                      <span className="size-1.5 rounded-full bg-current"/>
                      {role.label}
                    </span>
                  </td>
                  <td className="min-w-40 px-3">
                    {user.store ? <span className="inline-flex max-w-52 truncate rounded-lg border border-line/70 bg-black/15 px-2.5 py-1.5 text-xs text-ink">{user.store.name}</span> : <span className="text-xs text-mute">غير مرتبط بمتجر</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 text-xs text-mute">{user.createdAt.toLocaleDateString("ar-SA")}</td>
                </tr>;
            })}
          </DataTable>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-mute">لا يوجد مستخدمون حتى الآن</p>}
        </div>
      </Card>
    </>);
}
