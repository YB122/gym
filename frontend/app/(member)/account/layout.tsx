import Link from "next/link";
import type { ReactNode } from "react";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-black uppercase tracking-[0.18em] transition-colors hover:text-accent"
          >
            FORGE <span className="text-accent">/</span> Account
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
            Member portal
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
