import { Sidebar } from "@/components/layout/sidebar";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { getStore } from "@/lib/tenant/get-tenant";
import { prisma } from "@/lib/db/prisma";
import { logoutAction } from "@/server/auth/actions";
export default async function Layout({ children }) {
    const store = await getStore(); // also enforces auth + tenant
    const waiting = await prisma.conversation.count({ where: { storeId: store.id, status: "HANDOFF" } });
    return (<div className="flex min-h-screen">
      <Sidebar mode="dashboard" logout={logoutAction} waiting={waiting}/>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-line px-6 py-3 text-sm text-mute"><span>{store.name}</span><LiveRefresh /></div>
        <main className="p-6">{children}</main>
      </div>
    </div>);
}
