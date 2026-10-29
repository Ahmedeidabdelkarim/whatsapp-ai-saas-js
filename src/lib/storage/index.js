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
    const credentials = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }
        : {};
    return new S3Client({
        region: process.env.S3_REGION ?? "auto", ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        ...credentials,
    });
}
export async function saveFile(storeId, ext, buf) {
    const name = `${crypto.randomUUID()}.${ext}`; // unguessable name = the only "secret" of a public URL
    if (driver() === "s3") {
        if (!process.env.S3_BUCKET || !process.env.S3_PUBLIC_URL)
            throw new Error("S3_BUCKET and S3_PUBLIC_URL are required when STORAGE_DRIVER=s3");
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
export async function readFile(storeId, url) {
    const filenamePattern = /^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/;
    if (driver() === "s3") {
        const base = `${process.env.S3_PUBLIC_URL?.replace(/\/$/, "")}/`;
        if (!process.env.S3_BUCKET || !process.env.S3_PUBLIC_URL || !url.startsWith(`${base}uploads/${storeId}/`))
            throw new Error("The requested file is not in this store's S3 path");
        const key = url.slice(base.length);
        const filename = key.slice(`uploads/${storeId}/`.length);
        if (!filenamePattern.test(filename))
            throw new Error("The requested S3 file name is invalid");
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const result = await (await s3()).send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
        if (!result.Body)
            throw new Error("The requested S3 file has no content");
        return { body: Buffer.from(await result.Body.transformToByteArray()), contentType: result.ContentType ?? EXT_MIME[filename.split(".").pop()] };
    }
    const prefix = `${localPrefix()}${storeId}/`;
    if (!url.startsWith(prefix))
        throw new Error("The requested file is not in this store's upload path");
    const filename = url.slice(prefix.length);
    if (!filenamePattern.test(filename))
        throw new Error("The requested local file name is invalid");
    const body = await fs.readFile(path.join(uploadDir(), storeId, filename));
    return { body, contentType: EXT_MIME[filename.split(".").pop()] };
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
