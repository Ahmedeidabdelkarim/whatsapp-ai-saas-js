import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductImageUpload } from "@/components/products/image-upload";
import { getStore } from "@/lib/tenant/get-tenant";
import { getProduct, listCategories } from "@/server/products";
import { updateProductAction } from "@/server/products/actions";
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
          <form action={updateProductAction} className="space-y-3">
            <input type="hidden" name="id" value={p.id}/>
            <Input name="name" defaultValue={p.name} required/>
            <Textarea name="description" defaultValue={p.description ?? ""} placeholder="وصف المنتج (يعتمد عليه المساعد في الإجابة)" className="min-h-24"/>
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="price" type="number" step="0.01" min="0" defaultValue={p.priceHalalas / 100} required/>
              <Input name="stock" type="number" min="0" defaultValue={p.stock} required/>
              <Select name="categoryId" defaultValue={p.categoryId ?? ""}><option value="">القسم</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ${c.name}` : c.name}</option>)}</Select>
              <Input name="brandName" defaultValue={p.brand?.name ?? ""} placeholder="البراند"/>
            </div>
            <Input name="imageUrl" type="url" dir="ltr" placeholder="أو رابط صورة خارجي (اختياري)"/>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-[#25d366]"/>ظاهر للعملاء</label>
            <Button>حفظ</Button>
          </form>
        </Card>
        <Card title="الصورة"><ProductImageUpload productId={p.id} url={p.imageUrl}/></Card>
      </div>
    </>);
}
