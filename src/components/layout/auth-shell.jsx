import Link from "next/link";
import { Logo } from "./logo";
export function AuthShell({ title, children, footer }) {
    return (<main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel/70 p-8 backdrop-blur">
        <Link href="/"><Logo className="mb-6 text-xl"/></Link>
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-mute">{footer}</p>}
      </div>
    </main>);
}
