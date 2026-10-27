import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { ProductTable } from "@/components/products/product-table";
import { getStore } from "@/lib/tenant/get-tenant";
import { listCategories, listProducts } from "@/server/products";
export default async function Page() {
    const store = await getStore();
    const [products, cats] = await Promise.all([listProducts(store.id), listCategories(store.id)]);
    return (<>
      <PageHeader eyebrow="لوحة تحكم التاجر" title="الكتالوج"/>
      <div className="space-y-4">
        <Card title="منتج جديد"><ProductForm categories={cats.map((c) => ({ id: c.id, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))}/></Card>
        <Card title="الكتالوج · الأقسام والبراندات"><ProductTable products={products}/></Card>
      </div>
    </>);
}
