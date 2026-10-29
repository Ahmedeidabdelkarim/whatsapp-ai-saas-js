import nodemailer from "nodemailer";

export function getSmtpConfig(env = process.env) {
    const host = env.SMTP_HOST || (env.SMTP_USER ? "smtp.gmail.com" : "");
    if (!host)
        return null;
    const port = Number(env.SMTP_PORT || (host === "smtp.gmail.com" ? 465 : 587));
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error("SMTP_PORT must be a valid port number");
    if (!env.SMTP_USER || !env.SMTP_PASS)
        throw new Error("SMTP_USER and SMTP_PASS are required when SMTP_HOST is set");
    return {
        host,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        from: env.EMAIL_FROM || env.SMTP_USER,
    };
}

/** Sends through the hosting mailbox; no third-party email API fallback is used. */
export async function sendEmail(to, subject, html, textFallback) {
    let smtp;
    try {
        smtp = getSmtpConfig();
    }
    catch (e) {
        console.error("[email] invalid SMTP configuration:", e instanceof Error ? e.message : String(e));
        return { ok: false };
    }
    if (smtp) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: smtp.requireTLS,
                auth: smtp.auth, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
            });
            await transporter.sendMail({ from: smtp.from, to, subject, html, text: textFallback });
            return { ok: true };
        }
        catch (e) {
            console.error("[email] SMTP send failed:", e instanceof Error ? e.message : String(e));
            return { ok: false };
        }
    }
    if (process.env.NODE_ENV !== "production") {
        console.log(`\n[email:dev] SMTP is not configured; printing instead of sending.\nTo: ${to}\nSubject: ${subject}\n${textFallback}\n`);
        return { ok: true, dev: true };
    }
    console.error("[email] SMTP is not configured; password reset email was not sent");
    return { ok: false };
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
