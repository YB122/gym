import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/dashboard"
            className="text-sm font-black uppercase tracking-[0.18em] transition-colors hover:text-accent"
          >
            FORGE <span className="text-accent">/</span> Staff
          </Link>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Dashboard shell
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
