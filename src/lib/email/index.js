/** Sends mail through Resend's HTTP API (no SDK needed). Without RESEND_API_KEY it prints the mail to the terminal so dev works offline. */
export async function sendEmail(to, subject, html, textFallback) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        console.log(`\n[email:dev] RESEND_API_KEY not set, printing instead of sending.\nTo: ${to}\nSubject: ${subject}\n${textFallback}\n`);
        return { ok: true, dev: true };
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "onboarding@resend.dev", to: [to], subject, html }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
        console.error("[email] send failed", res.status, await res.text());
        return { ok: false };
    }
    return { ok: true };
}
export const otpEmail = (code) => ({
    subject: "رمز استعادة كلمة المرور",
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8">
    <h2>استعادة كلمة المرور</h2>
    <p>رمز التحقق الخاص بك:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f1f5f2;padding:12px 20px;border-radius:12px;display:inline-block;direction:ltr">${code}</p>
    <p>الرمز صالح لمدة 10 دقائق. لا تشاركه مع أحد، ولن نطلبه منك أبداً بأي وسيلة أخرى.</p>
    <p style="color:#666">إذا ما طلبت ذلك تجاهل الرسالة، ولن يتغير شيء.</p></div>`,
    text: `رمز التحقق: ${code}  (صالح 10 دقائق)`,
});
