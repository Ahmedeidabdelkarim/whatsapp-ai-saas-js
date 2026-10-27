import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/components/layout/auth-form";
import { ResendOtp } from "@/components/layout/resend-otp";
import { verifyOtpAction } from "@/server/auth/actions";

export default async function Page({ searchParams }) {
    const { email } = await searchParams;
    if (!email)
        redirect("/forgot-password");
    return (<AuthShell title="أدخل رمز التحقق" footer={<Link href="/forgot-password" className="text-wa">تغيير البريد</Link>}>
      <p className="mb-4 text-sm text-mute">إذا كان <b dir="ltr" className="text-ink">{email}</b> مسجّلاً عندنا فقد أرسلنا له رمزاً من 6 أرقام. الرمز صالح 10 دقائق.</p>
      <AuthForm action={verifyOtpAction} submit="تحقق" hidden={{ email }} fields={[
            { name: "code", label: "رمز التحقق", inputMode: "numeric", maxLength: 12, autoComplete: "one-time-code", placeholder: "------", className: "text-center text-2xl tracking-[0.4em]" },
        ]}/>
      <ResendOtp email={email}/>
    </AuthShell>);
}
