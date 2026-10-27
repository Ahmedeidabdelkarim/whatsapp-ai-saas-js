import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/layout/auth-form";
import { getResetSession } from "@/lib/auth/reset-session";
import { resetPasswordAction } from "@/server/auth/actions";

export default async function Page() {
    // The page is reachable only after a correct code (httpOnly cookie, 15 minutes). No secret in the URL.
    const session = await getResetSession();
    if (!session)
        return (<AuthShell title="انتهت الجلسة" footer={<Link href="/forgot-password" className="text-wa">ابدأ من جديد</Link>}>
        <p className="text-sm text-mute">لازم تدخل رمز التحقق أولاً. ابدأ استعادة كلمة المرور من جديد.</p>
      </AuthShell>);
    return (<AuthShell title="كلمة مرور جديدة">
      <AuthForm action={resetPasswordAction} submit="حفظ" fields={[
            { name: "password", label: "كلمة المرور الجديدة (8+ أحرف)", type: "password", autoComplete: "new-password" },
            { name: "confirm", label: "تأكيد كلمة المرور", type: "password", autoComplete: "new-password" },
        ]}/>
    </AuthShell>);
}
