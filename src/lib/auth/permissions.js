import { redirect } from "next/navigation";
import { getSession } from "./auth";
export async function requireUser() {
    const s = await getSession();
    if (!s)
        redirect("/login");
    return s;
}
export async function requireAdmin() {
    const s = await requireUser();
    if (s.role !== "SUPER_ADMIN")
        redirect("/dashboard");
    return s;
}
