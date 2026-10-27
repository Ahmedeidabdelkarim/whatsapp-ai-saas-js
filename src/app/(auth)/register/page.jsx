import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/layout/auth-form";
import { registerAction } from "@/server/auth/actions";
export default function Page() {
    return (<AuthShell title="ابدأ تجربتك المجانية" footer={<>عندك حساب؟ <Link href="/login" className="text-wa">دخول</Link></>}>
      <AuthForm action={registerAction} submit="إنشاء المتجر" fields={[
            { name: "storeName", label: "اسم المتجر" }, { name: "name", label: "اسمك" },
            { name: "email", label: "البريد الإلكتروني", type: "email" }, { name: "password", label: "كلمة المرور (8+ أحرف)", type: "password" }
        ]}/>
    </AuthShell>);
}
