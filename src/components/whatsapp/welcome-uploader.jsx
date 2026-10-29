"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
const ITEMS = [
    { kind: "IMAGE", label: "صورة تعريفية", hint: "JPG أو PNG حتى 5MB", accept: "image/jpeg,image/png" },
    { kind: "VIDEO", label: "فيديو تعريفي", hint: "MP4 (H.264) حتى 16MB", accept: "video/mp4,video/3gpp" },
    { kind: "VOICE", label: "رسالة صوتية", hint: "OGG (Opus) يظهر كرسالة صوتية حقيقية، أو MP3/M4A حتى 16MB", accept: ".ogg,.mp3,.m4a,.aac,.amr,audio/*" },
    { kind: "GUIDE", label: "دليل الشراء", hint: "PDF حتى 20MB", accept: "application/pdf" },
];
const preview = (kind) => `/api/uploads/preview?kind=${kind}`;
function Row({ item, url }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function upload(file) {
        setBusy(true);
        setError("");
        const fd = new FormData();
        fd.set("kind", item.kind);
        fd.set("file", file);
        try {
            const res = await fetch("/api/uploads", { method: "POST", body: fd });
            if (!res.ok) {
                setError((await res.json().catch(() => ({}))).error ?? "فشل الرفع");
                return;
            }
            router.refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
        }
        finally {
            setBusy(false);
        }
    }
    async function remove() {
        setBusy(true);
        setError("");
        try {
            const res = await fetch(`/api/uploads?kind=${item.kind}`, { method: "DELETE" });
            if (!res.ok) {
                setError((await res.json().catch(() => ({}))).error ?? "فشل حذف الملف");
                return;
            }
            router.refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">{item.label}</p><p className="text-xs text-mute">{item.hint}</p></div>
        <div className="flex gap-2">
          <label className={`cursor-pointer rounded-xl border border-line px-3 py-2 text-sm hover:bg-white/5 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "..." : url ? "استبدال" : "رفع ملف"}
            <input type="file" accept={item.accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f)
        upload(f); e.target.value = ""; }}/>
          </label>
          {url && <Button type="button" variant="danger" onClick={remove} disabled={busy}>حذف</Button>}
        </div>
      </div>
      {url && item.kind === "IMAGE" && <img src={preview(item.kind)} alt={item.label} className="mt-3 max-h-40 rounded-lg"/>}
      {url && item.kind === "VIDEO" && <video src={preview(item.kind)} controls className="mt-3 max-h-44 rounded-lg"/>}
      {url && item.kind === "VOICE" && <audio src={preview(item.kind)} controls className="mt-3 w-full"/>}
      {url && item.kind === "GUIDE" && <a href={preview(item.kind)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-wa">فتح الدليل ↗</a>}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>);
}
export function WelcomeUploader({ assets }) {
    return <div className="space-y-3">{ITEMS.map((i) => <Row key={i.kind} item={i} url={assets[i.kind]}/>)}</div>;
}
