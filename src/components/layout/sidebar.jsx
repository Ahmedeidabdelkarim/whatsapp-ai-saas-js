"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Layers, ShoppingBag, Users, MessageCircle, Smartphone, Bot, BarChart3, CreditCard, Settings, Store, Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";
const dash = [
    ["/dashboard", "نظرة عامة", LayoutDashboard], ["/dashboard/products", "المنتجات", Package], ["/dashboard/categories", "الأقسام", Layers],
    ["/dashboard/orders", "الطلبات", ShoppingBag], ["/dashboard/customers", "العملاء", Users], ["/dashboard/conversations", "المحادثات", MessageCircle],
    ["/dashboard/whatsapp", "واتساب وباقة الترحيب", Smartphone], ["/dashboard/ai", "المساعد الذكي", Bot], ["/dashboard/analytics", "التحليلات", BarChart3],
    ["/dashboard/billing", "الاشتراك", CreditCard], ["/dashboard/settings", "الإعدادات", Settings],
];
const admin = [
    ["/admin", "نظرة عامة", LayoutDashboard], ["/admin/stores", "المتاجر", Store], ["/admin/users", "المستخدمون", Users],
    ["/admin/subscriptions", "الاشتراكات", CreditCard], ["/admin/payments", "المدفوعات", Wallet], ["/admin/analytics", "التحليلات", BarChart3], ["/admin/settings", "الإعدادات", Settings],
];
export function Sidebar({ mode, logout, waiting = 0 }) {
    const path = usePathname();
    const items = mode === "admin" ? admin : dash;
    return (<aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-black/20 p-4 md:flex">
      <Logo className="mb-6 px-2 text-lg"/>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map(([href, label, Icon]) => {
            const on = href === "/dashboard" || href === "/admin" ? path === href : path.startsWith(href);
            return (<Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", on ? "bg-wa/15 text-wa" : "text-mute hover:bg-white/5 hover:text-ink")}>
              <Icon className="size-4"/>{label}
              {href === "/dashboard/conversations" && waiting > 0 && <span className="ms-auto rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-black">{waiting}</span>}
            </Link>);
        })}
      </nav>
      <form action={logout}><button className="w-full rounded-xl px-3 py-2 text-start text-sm text-mute hover:bg-white/5">تسجيل الخروج</button></form>
    </aside>);
}
