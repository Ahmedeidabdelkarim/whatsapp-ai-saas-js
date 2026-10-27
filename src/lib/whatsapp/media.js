import { graphBase } from "./client";
/** Two steps: media id -> temporary URL -> bytes (both need the access token). */
export async function downloadMedia(c, mediaId) {
    const meta = await fetch(`${graphBase()}/${mediaId}`, { headers: { Authorization: `Bearer ${c.accessToken}` }, signal: AbortSignal.timeout(10_000) });
    if (!meta.ok)
        return null;
    const { url, mime_type } = (await meta.json());
    const file = await fetch(url, { headers: { Authorization: `Bearer ${c.accessToken}` }, signal: AbortSignal.timeout(20_000) });
    if (!file.ok)
        return null;
    return { buf: Buffer.from(await file.arrayBuffer()), mime: mime_type };
}
