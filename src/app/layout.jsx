import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
export const metadata = { title: "متجرك كامل... داخل واتساب", description: "منصة تحوّل واتساب إلى متجر كامل بمساعد مبيعات ذكي." };
export default function RootLayout({ children }) {
    return (<html lang="ar" dir="rtl" className={plex.variable}>
      <body className="font-sans antialiased min-h-screen">{children}</body>
    </html>);
}
