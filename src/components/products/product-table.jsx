import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { StockBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sar } from "@/lib/utils/format";
import { deleteProductAction, setStockAction } from "@/server/products/actions";
export function ProductTable({ products }) {
    return (<DataTable head={["المنتج", "السعر", "المخزون", "تعديل المخزون", ""]}>
      {products.map((p) => (<tr key={p.id}>
          <td>
            <Link href={`/dashboard/products/${p.id}`} className="font-semibold text-wa hover:underline">{p.name}</Link>
            <p className="text-xs text-mute">{[p.category?.parent?.name, p.category?.name, p.brand?.name].filter(Boolean).join(" › ")}</p>
          </td>
          <td>{sar(p.priceHalalas)}</td>
          <td><StockBadge stock={p.stock}/></td>
          <td>
            <form action={setStockAction} className="flex gap-2"><input type="hidden" name="id" value={p.id}/>
              <Input name="stock" type="number" min="0" defaultValue={p.stock} className="w-24"/><Button variant="ghost">حفظ</Button></form>
          </td>
          <td><form action={deleteProductAction}><input type="hidden" name="id" value={p.id}/><Button variant="danger">حذف</Button></form></td>
        </tr>))}
    </DataTable>);
}
