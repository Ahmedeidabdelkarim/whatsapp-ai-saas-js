import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addProductAction } from "@/server/products/actions";
export function ProductForm({ categories }) {
    return (<form action={addProductAction} className="grid gap-3 md:grid-cols-6">
      <Input name="name" placeholder="اسم المنتج" required className="md:col-span-2"/>
      <Input name="price" type="number" step="0.01" min="0" placeholder="السعر (ر.س)" required/>
      <Input name="stock" type="number" min="0" placeholder="المخزون" required/>
      <Select name="categoryId" defaultValue=""><option value="">القسم</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
      <Input name="brandName" placeholder="البراند"/>
      <Input name="imageUrl" type="url" dir="ltr" placeholder="رابط الصورة (اختياري)" className="md:col-span-5"/>
      <Button>إضافة</Button>
    </form>);
}
