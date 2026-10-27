"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { manageStaffCartAction, sendStaffCartPaymentAction } from "@/server/settings-actions";

export function StaffCartEditor({ conversationId, cart, products, canSendPayment, pendingOrder }) {
    const [cartState, cartAction, cartPending] = useActionState(manageStaffCartAction, undefined);
    const [paymentState, paymentAction, paymentPending] = useActionState(sendStaffCartPaymentAction, undefined);
    return <section className="mt-4 space-y-4 rounded-2xl border border-line p-4">
      <div>
        <h2 className="font-semibold">تجهيز طلب العميل</h2>
        <p className="mt-1 text-sm text-mute">أضف المنتجات أو عدّل الكميات، ثم أرسل الإجمالي ورابط الدفع للعميل.</p>
      </div>
      {cart?.items.length ? <ul className="space-y-3">
        {cart.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className="min-w-40">
            <p>{item.product.name}</p>
            <p className="text-sm text-mute">{item.quantity} × {(item.product.priceHalalas / 100).toLocaleString("ar-SA")} ر.س</p>
          </div>
          <form action={cartAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={conversationId}/>
            <input type="hidden" name="productId" value={item.productId}/>
            <input type="hidden" name="operation" value="set"/>
            <Input name="quantity" type="number" min="1" max={item.product.stock} defaultValue={item.quantity} className="w-24"/>
            <Button variant="ghost" disabled={cartPending}>تعديل</Button>
          </form>
          <form action={cartAction}>
            <input type="hidden" name="id" value={conversationId}/>
            <input type="hidden" name="productId" value={item.productId}/>
            <input type="hidden" name="operation" value="remove"/>
            <Button variant="danger" disabled={cartPending}>حذف</Button>
          </form>
        </li>)}
      </ul> : <p className="text-sm text-mute">لا توجد منتجات في السلة بعد.</p>}
      <form action={cartAction} className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]">
        <input type="hidden" name="id" value={conversationId}/>
        <input type="hidden" name="operation" value="add"/>
        <Select name="productId" required defaultValue="">
          <option value="" disabled>اختر منتجاً لإضافته</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {(product.priceHalalas / 100).toLocaleString("ar-SA")} ر.س · متوفر {product.stock}</option>)}
        </Select>
        <Input name="quantity" type="number" min="1" defaultValue="1" required aria-label="الكمية"/>
        <Button disabled={cartPending || !products.length}>{cartPending ? "..." : "إضافة للسلة"}</Button>
      </form>
      {cartState?.message && <p role="status" className={`text-sm ${cartState.ok ? "text-wa" : "text-red-300"}`}>{cartState.message}</p>}
      <form action={paymentAction} className="border-t border-line pt-4">
        <input type="hidden" name="id" value={conversationId}/>
        <Button disabled={paymentPending || (!cart?.items.length && !pendingOrder) || !canSendPayment}>
          {paymentPending ? "جارٍ تجهيز الطلب..." : cart?.items.length ? "إرسال الإجمالي ورابط الدفع" : pendingOrder ? "إعادة إرسال الطلب ورابط الدفع" : "إرسال الإجمالي ورابط الدفع"}
        </Button>
        {!canSendPayment && <p className="mt-2 text-sm text-mute">يلزم تولّي المحادثة وتفعيل Moyasar وربط واتساب قبل الإرسال.</p>}
        {paymentState?.message && <p role="status" className={`mt-2 text-sm ${paymentState.ok ? "text-wa" : "text-red-300"}`}>{paymentState.message}</p>}
      </form>
    </section>;
}
