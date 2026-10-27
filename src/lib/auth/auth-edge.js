import { jwtVerify } from "jose";
export async function readToken(token) {
    if (!token)
        return null;
    try {
        return (await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))).payload;
    }
    catch {
        return null;
    }
}
