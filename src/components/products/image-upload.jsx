"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const preview = (u) => u.replace(/^https?:\/\/[^/]+(?=\/api\/files\/)/, "");
export function ProductImageUpload({ productId, url }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function upload(file) {
        setBusy(true);
        setError("");
        const fd = new FormData();
        fd.set("kind", "IMAGE");
        fd.set("productId", productId);
        fd.set("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        if (!res.ok)
            setError((await res.json().catch(() => ({}))).error ?? "فشل الرفع");
        setBusy(false);
        router.refresh();
    }
    return (<div className="space-y-2">
      {url ? <img src={preview(url)} alt="" className="h-40 rounded-xl object-cover"/> : <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-mute">لا توجد صورة</div>}
      <label className={`inline-block cursor-pointer rounded-xl border border-line px-3 py-2 text-sm hover:bg-white/5 ${busy ? "pointer-events-none opacity-50" : ""}`}>
        {busy ? "..." : url ? "استبدال الصورة" : "رفع صورة"}
        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f)
        upload(f); e.target.value = ""; }}/>
      </label>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>);
}
