import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
const COOKIE = "session";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const hashPassword = (p) => bcrypt.hash(p, 10);
export const verifyPassword = (p, h) => bcrypt.compare(p, h);
export async function createSession(s) {
    const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d").sign(key());
    (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}
export async function destroySession() { (await cookies()).delete(COOKIE); }
export async function readToken(token) {
    if (!token)
        return null;
    try {
        return (await jwtVerify(token, key())).payload;
    }
    catch {
        return null;
    }
}
export async function getSession() { return readToken((await cookies()).get(COOKIE)?.value); }
