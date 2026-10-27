"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
/**
 * Mounted once in the dashboard layout. Opens a Server-Sent Events stream; when the server says something changed
 * (new message, handoff, stage...) the current page re-reads its data with router.refresh(): no page reload, typed text is kept.
 * If the stream is down it falls back to a slow poll, and the browser reconnects by itself.
 */
export function LiveRefresh() {
    const router = useRouter();
    const [live, setLive] = useState(false);
    const liveRef = useRef(false);
    useEffect(() => {
        let timer;
        const refresh = () => { clearTimeout(timer); timer = setTimeout(() => router.refresh(), 350); }; // coalesce bursts (media + menu + text)
        const es = new EventSource("/api/realtime");
        es.onopen = () => { liveRef.current = true; setLive(true); };
        es.onerror = () => { liveRef.current = false; setLive(false); };
        es.onmessage = (e) => { try {
            if (JSON.parse(e.data).type !== "hello")
                refresh();
        }
        catch {
            refresh();
        } };
        const fallback = setInterval(() => { if (!liveRef.current)
            router.refresh(); }, 12_000);
        return () => { es.close(); clearTimeout(timer); clearInterval(fallback); };
    }, [router]);
    return (<span className={`inline-flex items-center gap-1.5 text-xs ${live ? "text-wa" : "text-mute"}`} title={live ? "التحديث المباشر يعمل" : "غير متصل، يُحدَّث كل 12 ثانية"}>
      <span className={`size-2 rounded-full ${live ? "bg-wa" : "bg-mute"}`}/>{live ? "مباشر" : "غير متصل"}
    </span>);
}
