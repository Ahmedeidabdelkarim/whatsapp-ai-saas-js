import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addProductAction } from "@/server/products/actions";

const fieldClass = "h-11 rounded-xl border-line/80 bg-black/30 shadow-inner shadow-black/10 transition duration-200 placeholder:text-mute/50 hover:border-wa/50 focus:border-wa focus:bg-black/40 focus:ring-2 focus:ring-wa/15";

export function ProductForm({ categories }) {
    return (<form action={addProductAction} className="grid gap-3 md:grid-cols-6">
      <Input name="name" placeholder="اسم المنتج" required minLength={2} className={`${fieldClass} md:col-span-2`}/>
      <Textarea name="description" placeholder="وصف المنتج والمواصفات (يساعد المساعد على ترشيحه)" className={`${fieldClass} min-h-28 leading-7 md:col-span-6`}/>
      <Input name="price" type="number" step="0.01" min="0.01" placeholder="السعر (ر.س)" required className={fieldClass}/>
      <Input name="stock" type="number" min="0" step="1" placeholder="المخزون" required className={fieldClass}/>
      <Select name="categoryId" defaultValue="" className={fieldClass}>
        <option value="">القسم</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </Select>
      <Input name="brandName" placeholder="البراند" className={fieldClass}/>
      <Input name="imageUrl" type="url" dir="ltr" placeholder="رابط الصورة (اختياري)" className={`${fieldClass} text-start md:col-span-5`}/>
      <Button className="min-h-11">إضافة</Button>
    </form>);
}
