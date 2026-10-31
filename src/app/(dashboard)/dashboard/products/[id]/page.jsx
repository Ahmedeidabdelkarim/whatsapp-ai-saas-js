import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ProductEditForm } from "@/components/products/product-edit-form";
import { ProductImageUpload } from "@/components/products/image-upload";
import { getStore } from "@/lib/tenant/get-tenant";
import { getProduct, listCategories } from "@/server/products";
export default async function Page({ params }) {
    const { id } = await params;
    const store = await getStore();
    const [p, cats] = await Promise.all([getProduct(store.id, id), listCategories(store.id)]);
    if (!p)
        notFound();
    return (<>
      <PageHeader eyebrow="الكتالوج" title={p.name}/>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card title="بيانات المنتج">
          <ProductEditForm product={p} categories={cats}/>
        </Card>
        <Card title="الصورة"><ProductImageUpload productId={p.id} url={p.imageUrl}/></Card>
      </div>
    </>);
}
