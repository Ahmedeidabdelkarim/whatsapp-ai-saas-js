import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000; // the emailed code is valid for 10 minutes
export const MAX_ATTEMPTS = 5; // wrong guesses allowed per code
export const RESET_SESSION_MS = 15 * 60_000; // after a correct code the user has 15 minutes to choose a password

const key = () => {
    const k = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
    if (!k) throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set");
    return k;
};

/** Cryptographically random, zero-padded: "004821" is a valid code. */
export const generateOtp = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

/**
 * HMAC with a server secret, bound to the user. A plain hash of a 6-digit code could be brute-forced in
 * milliseconds if the table ever leaked; without the server secret the HMAC can't be.
 */
export const hashOtp = (userId, code) => crypto.createHmac("sha256", key()).update(`${userId}:${code}`).digest("hex");

export function checkOtp(userId, code, storedHash) {
    const a = Buffer.from(hashOtp(userId, code));
    const b = Buffer.from(storedHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** People type codes with Arabic-Indic digits (١٢٣٤٥٦) or spaces. Turn that into plain digits. */
export const normalizeOtpInput = (input) =>
    String(input ?? "")
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/\D/g, "");

/** A code can still be tried only if it is unexpired, not yet used, and under the attempt limit. */
export const isOtpUsable = (row, now = Date.now()) => row.verifiedAt == null && row.attempts < MAX_ATTEMPTS && row.expiresAt.getTime() > now;
