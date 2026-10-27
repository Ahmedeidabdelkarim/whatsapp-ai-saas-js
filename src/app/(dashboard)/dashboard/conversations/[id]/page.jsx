import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thread } from "@/components/conversations/thread";
import { ReplyBox } from "@/components/conversations/reply-box";
import { StaffCartEditor } from "@/components/conversations/staff-cart-editor";
import { StagePill, StatusPill } from "@/components/dashboard/stage-pill";
import { getStore } from "@/lib/tenant/get-tenant";
import { getConversation } from "@/server/conversations";
import { handoffAction } from "@/server/settings-actions";
import { prisma } from "@/lib/db/prisma";
import { getWaCreds } from "@/lib/whatsapp/creds";
export default async function Page({ params }) {
    const { id } = await params;
    const store = await getStore();
    const conv = await getConversation(store.id, id);
    if (!conv)
        notFound();
    const humanInControl = conv.status === "HANDOFF" || conv.status === "STAFF_ACTIVE";
    const products = await prisma.product.findMany({ where: { storeId: store.id, active: true, stock: { gt: 0 } }, orderBy: { name: "asc" }, select: { id: true, name: true, priceHalalas: true, stock: true } });
    const pendingOrder = await prisma.order.findFirst({ where: { storeId: store.id, conversationId: conv.id, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { id: true } });
    const canSendPayment = humanInControl && !!store.moyasarSecretKey && !!getWaCreds(store);
    return (<>
      <PageHeader title={conv.customer.name ?? `+${conv.customer.waId}`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={conv.status}/><StagePill stage={conv.stage}/>
          <Link href={`/dashboard/customers/${conv.customerId}`} className="text-sm text-wa">ملف العميل ↗</Link>
          <form action={handoffAction}><input type="hidden" name="id" value={conv.id}/><input type="hidden" name="on" value={humanInControl ? "0" : "1"}/>
            <Button variant="ghost">{humanInControl ? "إعادة المحادثة لـ AI" : "تولّي المحادثة"}</Button></form>
        </div>
      </PageHeader>
      <Card><Thread messages={conv.messages}/>{conv.status !== "CLOSED" && <>
        <StaffCartEditor conversationId={conv.id} cart={conv.cart} products={products} canSendPayment={canSendPayment} pendingOrder={pendingOrder}/>
        <ReplyBox conversationId={conv.id}/>
      </>}</Card>
    </>);
}
