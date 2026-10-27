import crypto from "crypto";
const PREFIX = "enc:v1:";
const key = () => {
    const k = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
    if (!k)
        throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set");
    return crypto.createHash("sha256").update(k).digest();
};
/** AES-256-GCM. Used for third-party credentials stored in the DB (WhatsApp token, Moyasar key). */
export function encryptSecret(plain) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
    const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
    return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
/** Values without the prefix are legacy plaintext and are returned as-is (so old rows keep working). */
export function decryptSecret(stored) {
    if (!stored.startsWith(PREFIX))
        return stored;
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const d = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
export const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
export function safeEqual(a, b) {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}
