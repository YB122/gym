import Link from "next/link";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:text-accent"
          >
            FORGE <span className="text-accent">/</span> Strength Club
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-accent"
          >
            Member login
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FORGE Strength Club. All rights reserved.</p>
          <p>Foundation build · Phase 0</p>
        </div>
      </footer>
    </div>
  );
}
