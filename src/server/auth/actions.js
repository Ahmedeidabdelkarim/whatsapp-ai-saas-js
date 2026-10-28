"use server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth/auth";
import { clientIp } from "@/lib/utils/ip";
import { rateLimit } from "@/lib/utils/rate-limit";
import { hashToken } from "@/lib/utils/secret";
import { sendEmail, otpEmail } from "@/lib/email";
import { getResetSession, RESET_COOKIE } from "@/lib/auth/reset-session";
import { OTP_TTL_MS, RESET_SESSION_MS, MAX_ATTEMPTS, checkOtp, generateOtp, hashOtp, normalizeOtpInput } from "@/lib/auth/otp";
const TOO_MANY = { error: "محاولات كثيرة، حاول بعد قليل" };
const MIN = 60_000;
export async function loginAction(_, fd) {
    const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(fd));
    if (!p.success)
        return { error: "بيانات غير صحيحة" };
    const email = p.data.email.toLowerCase();
    const ip = await clientIp();
    if (!rateLimit(`login:ip:${ip}`, 30, 15 * MIN).ok || !rateLimit(`login:email:${email}`, 8, 15 * MIN).ok)
        return TOO_MANY;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(p.data.password, user.passwordHash)))
        return { error: "البريد أو كلمة المرور خاطئة" };
    if (user.role !== "SUPER_ADMIN") {
        const store = user.storeId && await prisma.store.findUnique({ where: { id: user.storeId }, select: { isActive: true } });
        if (!store?.isActive)
            return { error: "هذا المتجر موقوف حاليًا. تواصل مع إدارة المنصة." };
    }
    await createSession({ userId: user.id, role: user.role, storeId: user.storeId });
    redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
}
export async function registerAction(_, fd) {
    const p = z.object({ storeName: z.string().min(2), name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).safeParse(Object.fromEntries(fd));
    if (!p.success)
        return { error: "تأكد من البيانات (كلمة المرور 8 أحرف على الأقل)" };
    if (!rateLimit(`register:ip:${await clientIp()}`, 5, 60 * MIN).ok)
        return TOO_MANY;
    const email = p.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } }))
        return { error: "البريد مسجّل مسبقاً" };
    const trial = await prisma.plan.findUniqueOrThrow({ where: { key: "trial" } });
    const slug = `${p.data.storeName.replace(/\s+/g, "-").toLowerCase().replace(/[^\w\u0600-\u06FF-]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    const user = await prisma.user.create({
        data: {
            email, name: p.data.name, passwordHash: await hashPassword(p.data.password),
            store: { create: { name: p.data.storeName, slug, subscription: { create: { planId: trial.id, currentPeriodEnd: new Date(Date.now() + 14 * 864e5) } } } },
        },
    });
    await createSession({ userId: user.id, role: user.role, storeId: user.storeId });
    redirect("/dashboard/whatsapp");
}
/** Creates a fresh code for the user (older ones are discarded) and emails it. A failed email is logged, never revealed. */
async function issueOtp(user) {
    const code = generateOtp();
    await prisma.$transaction([
        prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetOtp.create({ data: { userId: user.id, codeHash: hashOtp(user.id, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } }),
    ]);
    const mail = otpEmail(code);
    await sendEmail(user.email, mail.subject, mail.html, mail.text);
}

/**
 * Same limits whether or not the email exists, so the limits themselves can't be used to discover accounts:
 * 1 code per minute and 5 per hour per email, 10 per 15 minutes per IP.
 */
async function otpAllowed(email) {
    if (!rateLimit(`otp:ip:${await clientIp()}`, 10, 15 * MIN).ok) return TOO_MANY;
    if (!rateLimit(`otp:min:${email}`, 1, MIN).ok) return { error: "انتظر دقيقة قبل طلب رمز جديد" };
    if (!rateLimit(`otp:hour:${email}`, 5, 60 * MIN).ok) return TOO_MANY;
    return null;
}

/** Step 1: email -> 6-digit code by email -> go to the code screen. Always answers the same way (no account enumeration). */
export async function forgotPasswordAction(_, fd) {
    const p = z.object({ email: z.string().email() }).safeParse(Object.fromEntries(fd));
    if (!p.success)
        return { error: "اكتب بريداً صحيحاً" };
    const email = p.data.email.toLowerCase();
    const blocked = await otpAllowed(email);
    if (blocked)
        return blocked;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user)
        await issueOtp(user);
    redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

/** "Send the code again" button on the code screen. */
export async function resendOtpAction(_, fd) {
    const p = z.object({ email: z.string().email() }).safeParse(Object.fromEntries(fd));
    if (!p.success)
        return { error: "بريد غير صحيح" };
    const email = p.data.email.toLowerCase();
    const blocked = await otpAllowed(email);
    if (blocked)
        return blocked;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user)
        await issueOtp(user);
    return { message: "أرسلنا رمزاً جديداً. الرمز السابق لم يعد صالحاً." };
}

/**
 * Step 2: check the code. Every guess is counted BEFORE it is compared (atomic update), so even parallel
 * guesses can't exceed 5 tries per code. All failures give the same message.
 */
export async function verifyOtpAction(_, fd) {
    const p = z.object({ email: z.string().email(), code: z.string() }).safeParse(Object.fromEntries(fd));
    const code = normalizeOtpInput(p.success ? p.data.code : "");
    if (!p.success || code.length !== 6)
        return { error: "اكتب الرمز المكوّن من 6 أرقام" };
    const email = p.data.email.toLowerCase();
    const FAIL = { error: "الرمز غير صحيح أو منتهي. اطلب رمزاً جديداً إذا لزم." };
    if (!rateLimit(`otpverify:ip:${await clientIp()}`, 20, 15 * MIN).ok || !rateLimit(`otpverify:email:${email}`, 10, 15 * MIN).ok)
        return TOO_MANY;

    const user = await prisma.user.findUnique({ where: { email } });
    const row = user && (await prisma.passwordResetOtp.findFirst({ where: { userId: user.id, verifiedAt: null }, orderBy: { createdAt: "desc" } }));
    if (!user || !row)
        return FAIL;
    const counted = await prisma.passwordResetOtp.updateMany({
        where: { id: row.id, verifiedAt: null, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
        data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0 || !checkOtp(user.id, code, row.codeHash))
        return FAIL;

    // Correct code: trade it for a short-lived reset session. Only the hash of the cookie token is stored.
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetOtp.update({ where: { id: row.id }, data: { verifiedAt: new Date(), resetTokenHash: hashToken(token), resetExpiresAt: new Date(Date.now() + RESET_SESSION_MS) } });
    (await cookies()).set(RESET_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESET_SESSION_MS / 1000 });
    redirect("/reset-password");
}

/** Step 3: new password. Needs the reset session from step 2; using it deletes every pending code for the user. */
export async function resetPasswordAction(_, fd) {
    const p = z.object({ password: z.string().min(8), confirm: z.string() }).safeParse(Object.fromEntries(fd));
    if (!p.success)
        return { error: "كلمة المرور 8 أحرف على الأقل" };
    if (p.data.password !== p.data.confirm)
        return { error: "كلمتا المرور غير متطابقتين" };
    const row = await getResetSession();
    if (!row)
        return { error: "انتهت الجلسة. ابدأ استعادة كلمة المرور من جديد." };
    await prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(p.data.password) } }),
        prisma.passwordResetOtp.deleteMany({ where: { userId: row.userId } }),
    ]);
    (await cookies()).delete(RESET_COOKIE);
    redirect("/login?reset=1");
}
export async function logoutAction() { await destroySession(); redirect("/login"); }
