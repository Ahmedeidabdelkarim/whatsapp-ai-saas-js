import { NextResponse } from "next/server";
import { readToken } from "@/lib/auth/auth-edge";
export async function middleware(req) {
    const s = await readToken(req.cookies.get("session")?.value);
    const { pathname } = req.nextUrl;
    if (!s)
        return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/admin") && s.role !== "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
