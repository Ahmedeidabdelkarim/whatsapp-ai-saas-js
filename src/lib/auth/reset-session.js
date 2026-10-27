import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/utils/secret";

export const RESET_COOKIE = "reset_session";

/**
 * The reset session proven by a correct emailed code. Lives in a normal module (not in a "use server" file) on purpose:
 * every export of a "use server" file is a public endpoint, and this one returns database fields.
 */
export async function getResetSession() {
    const token = (await cookies()).get(RESET_COOKIE)?.value;
    if (!token)
        return null;
    const row = await prisma.passwordResetOtp.findUnique({ where: { resetTokenHash: hashToken(token) } });
    return row && row.verifiedAt && row.resetExpiresAt && row.resetExpiresAt > new Date() ? row : null;
}
