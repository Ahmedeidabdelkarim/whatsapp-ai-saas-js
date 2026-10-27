import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { EXT_MIME } from "./validate";
/**
 * Two drivers, chosen by STORAGE_DRIVER:
 *  - "local" (default): files go to UPLOAD_DIR and are served by /api/files/... (needs APP_URL to be a PUBLIC https URL, e.g. ngrok/your domain)
 *  - "s3": any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase...) with a public base URL
 * WhatsApp downloads the media itself from the URL, so it must be reachable from the internet.
 */
export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const driver = () => (process.env.STORAGE_DRIVER === "s3" ? "s3" : "local");
const localPrefix = () => `${process.env.APP_URL}/api/files/`;
async function s3() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const endpoint = process.env.S3_ENDPOINT;
    return new S3Client({
        region: process.env.S3_REGION ?? "auto", ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    });
}
export async function saveFile(storeId, ext, buf) {
    const name = `${crypto.randomUUID()}.${ext}`; // unguessable name = the only "secret" of a public URL
    if (driver() === "s3") {
        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const key = `uploads/${storeId}/${name}`;
        await (await s3()).send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buf, ContentType: EXT_MIME[ext], CacheControl: "public, max-age=31536000" }));
        return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    }
    const dir = path.join(uploadDir(), storeId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
    return `${localPrefix()}${storeId}/${name}`;
}
/** Best effort: failing to delete an old file must never block the merchant. */
export async function deleteFile(url) {
    try {
        if (driver() === "s3") {
            const base = process.env.S3_PUBLIC_URL.replace(/\/$/, "") + "/";
            if (!url.startsWith(base))
                return;
            const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
            await (await s3()).send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: url.slice(base.length) }));
        }
        else if (url.startsWith(localPrefix())) {
            const rel = url.slice(localPrefix().length);
            const full = path.resolve(uploadDir(), rel);
            if (full.startsWith(uploadDir() + path.sep))
                await fs.unlink(full);
        }
    }
    catch (e) {
        console.warn("[storage] delete failed", e.message);
    }
}
