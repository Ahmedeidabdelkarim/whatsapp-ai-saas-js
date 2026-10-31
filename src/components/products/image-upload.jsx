"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function ProductImageUpload({ productId, url }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [imageUrl, setImageUrl] = useState(url);
    useEffect(() => setImageUrl(url), [productId, url]);
    async function upload(file) {
        setBusy(true);
        setError("");
        const fd = new FormData();
        fd.set("kind", "IMAGE");
        fd.set("productId", productId);
        fd.set("file", file);
        try {
            const res = await fetch("/api/uploads", { method: "POST", body: fd });
            if (!res.ok) {
                setError((await res.json().catch(() => ({}))).error ?? "فشل الرفع");
                return;
            }
            const result = await res.json();
            setImageUrl(result.url);
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
            const params = new URLSearchParams({ kind: "IMAGE", productId });
            const res = await fetch(`/api/uploads?${params}`, { method: "DELETE" });
            if (!res.ok) {
                setError((await res.json().catch(() => ({}))).error ?? "فشل حذف الصورة");
                return;
            }
            setImageUrl(null);
            router.refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="space-y-2">
      {imageUrl ? <img src={`/api/uploads/preview?kind=IMAGE&productId=${encodeURIComponent(productId)}&v=${encodeURIComponent(imageUrl)}`} alt="صورة المنتج" className="h-40 w-full rounded-xl object-cover"/> : <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-mute">لا توجد صورة</div>}
      <label className={`inline-block cursor-pointer rounded-xl border border-line px-3 py-2 text-sm hover:bg-white/5 ${busy ? "pointer-events-none opacity-50" : ""}`}>
        {busy ? "..." : imageUrl ? "استبدال الصورة" : "رفع صورة"}
        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f)
        upload(f); e.target.value = ""; }}/>
      </label>
      {imageUrl && <button type="button" onClick={remove} disabled={busy} className="ms-2 rounded-xl border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10 disabled:opacity-50">حذف الصورة</button>}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>);
}
