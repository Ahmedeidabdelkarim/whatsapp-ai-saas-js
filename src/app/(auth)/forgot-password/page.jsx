import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/layout/auth-form";
import { forgotPasswordAction } from "@/server/auth/actions";
export default function Page() {
    return (<AuthShell title="استعادة كلمة المرور" footer={<Link href="/login" className="text-wa">الرجوع للدخول</Link>}>
      <p className="mb-4 text-sm text-mute">اكتب بريدك وبنرسل لك رمز تحقق من 6 أرقام.</p>
      <AuthForm action={forgotPasswordAction} submit="أرسل الرمز" fields={[{ name: "email", label: "البريد الإلكتروني", type: "email" }]}/>
    </AuthShell>);
}
