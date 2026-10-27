import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/layout/auth-form";
import { loginAction } from "@/server/auth/actions";
export default async function Page({ searchParams }) {
    const { reset } = await searchParams;
    return (<AuthShell title="تسجيل الدخول" footer={<>ما عندك حساب؟ <Link href="/register" className="text-wa">سجّل متجرك</Link> · <Link href="/forgot-password" className="text-wa">نسيت كلمة المرور</Link></>}>
      {reset && <p className="mb-4 rounded-xl bg-wa/15 p-3 text-sm text-wa">تم تغيير كلمة المرور، سجّل دخولك.</p>}
      <AuthForm action={loginAction} submit="دخول" fields={[{ name: "email", label: "البريد الإلكتروني", type: "email" }, { name: "password", label: "كلمة المرور", type: "password" }]}/>
    </AuthShell>);
}
