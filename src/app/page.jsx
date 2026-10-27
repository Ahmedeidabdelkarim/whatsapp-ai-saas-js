import Link from "next/link";
import { Logo } from "@/components/layout/logo";
const features = [
    ["01 — تجربة العميل على واتساب", "ترحيب غني وقوائم تفاعلية", "من أول رسالة يستلم العميل فيديو تعريفي، رسالة صوتية ودليل شراء — ويتنقّل بين الأقسام والبراندات بسهولة."],
    ["02 — مساعد مبيعات ذكي", "يرد لحظياً من كتالوجك فقط", "ذكاء اصطناعي مربوط بمنتجاتك وأسعارك ومخزونك — إجابات دقيقة بدون معلومات مختلقة، ويقفل البيعة."],
    ["03 — لوحة تحكم التاجر", "كل شي تحت سيطرتك من مكان واحد", "الكتالوج، الأقسام والبراندات، شخصية البوت، وباقة الترحيب التلقائية."],
    ["04 — تحليلات وإدارة العملاء", "اعرف مين اشترى... ومين تردّد", "قمع المبيعات، أكثر المنتجات طلباً، وحملة متابعة لعملاء توقفوا في منتصف المحادثة."],
];
export default function Home() {
    return (<main>
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <Logo className="text-xl"/>
        <div className="flex gap-3 text-sm">
          <Link href="/login" className="rounded-xl px-4 py-2 text-mute hover:text-ink">دخول</Link>
          <Link href="/register" className="rounded-xl bg-wa px-4 py-2 font-semibold text-bg">ابدأ مجاناً</Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">متجرك كامل... <span className="text-wa">داخل واتساب</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mute">ارفع منتجاتك، اربط رقمك، والمساعد الذكي يستقبل عملاءك، يعرض المنتجات ويقفل الطلبات.</p>
        <Link href="/register" className="mt-8 inline-block rounded-xl bg-wa px-6 py-3 font-bold text-bg">جرّب 14 يوم مجاناً</Link>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-2">
        {features.map(([k, t, d]) => (<article key={k} className="rounded-2xl border border-line bg-panel/60 p-6">
            <p className="text-sm text-wa">{k}</p><h2 className="mt-2 text-2xl font-bold">{t}</h2><p className="mt-3 text-mute">{d}</p>
          </article>))}
      </section>
    </main>);
}
