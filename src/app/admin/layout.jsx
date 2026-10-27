import { Sidebar } from "@/components/layout/sidebar";
import { requireAdmin } from "@/lib/auth/permissions";
import { logoutAction } from "@/server/auth/actions";
export default async function Layout({ children }) {
    await requireAdmin();
    return <div className="flex min-h-screen"><Sidebar mode="admin" logout={logoutAction}/><main className="min-w-0 flex-1 p-6">{children}</main></div>;
}
