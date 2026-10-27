import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadDir } from "@/lib/storage";
import { EXT_MIME } from "@/lib/storage/validate";
/** Public on purpose: WhatsApp's servers fetch these files. Names are random UUIDs; only files we wrote are served. */
export async function GET(_, { params }) {
    const { path: parts } = await params;
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(parts[1]))
        return new NextResponse("Not found", { status: 404 });
    const mime = EXT_MIME[parts[1].split(".").pop()];
    if (!mime)
        return new NextResponse("Not found", { status: 404 });
    try {
        const buf = await fs.readFile(path.join(uploadDir(), parts[0], parts[1]));
        return new Response(new Uint8Array(buf), {
            headers: { "Content-Type": mime, "Content-Length": String(buf.length), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
        });
    }
    catch {
        return new NextResponse("Not found", { status: 404 });
    }
}
