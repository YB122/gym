import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">This page does not exist.</h1>
        <p className="mt-3 text-sm text-muted">
          The link may be outdated, or the page has not been built yet.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to FORGE</Link>
        </Button>
      </div>
    </main>
  );
}
