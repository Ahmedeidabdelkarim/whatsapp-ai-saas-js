import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { getStore } from "@/lib/tenant/get-tenant";
import { listCategories } from "@/server/products";
import { addCategoryAction } from "@/server/products/actions";
export default async function Page() {
    const store = await getStore();
    const cats = await listCategories(store.id);
    return (<>
      <PageHeader title="الأقسام"/>
      <div className="space-y-4">
        <Card title="قسم جديد">
          <form action={addCategoryAction} className="flex flex-wrap gap-3">
            <Input name="name" placeholder="اسم القسم" required className="max-w-xs"/>
            <Select name="parentId" defaultValue="" className="max-w-xs"><option value="">قسم رئيسي</option>{cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>تحت: {c.name}</option>)}</Select>
            <Button>إضافة</Button>
          </form>
        </Card>
        <Card>
          <DataTable head={["القسم", "يتبع", "عدد المنتجات"]}>
            {cats.map((c) => <tr key={c.id}><td>{c.name}</td><td className="text-mute">{c.parent?.name ?? "—"}</td><td>{c._count.products}</td></tr>)}
          </DataTable>
        </Card>
      </div>
    </>);
}
