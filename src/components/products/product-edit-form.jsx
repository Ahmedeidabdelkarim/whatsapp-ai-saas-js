"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { updateProductAction } from "@/server/products/actions";

export function ProductEditForm({ product, categories }) {
    const [state, action, pending] = useActionState(updateProductAction, undefined);
    return (<form action={action} className="space-y-3">
      <input type="hidden" name="id" value={product.id}/>
      <Input name="name" defaultValue={product.name} required/>
      <Textarea name="description" defaultValue={product.description ?? ""} placeholder="وصف المنتج (يعتمد عليه المساعد في الإجابة)" className="min-h-24"/>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="price" type="number" step="0.01" min="0" defaultValue={product.priceHalalas / 100} required/>
        <Input name="stock" type="number" min="0" defaultValue={product.stock} required/>
        <Select name="categoryId" defaultValue={product.categoryId ?? ""}>
          <option value="">القسم</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.parent ? `${category.parent.name} › ${category.name}` : category.name}</option>)}
        </Select>
        <Input name="brandName" defaultValue={product.brand?.name ?? ""} placeholder="البراند"/>
      </div>
      <Input name="imageUrl" type="url" dir="ltr" placeholder="أو رابط صورة خارجي (اختياري)"/>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
        {state?.message && <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-wa" : "text-red-300"}`}>{state.message}</p>}
      </div>
    </form>);
}
