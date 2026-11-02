"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Something broke</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">We hit an unexpected error.</h1>
        <p className="mt-3 text-sm text-muted">
          The page could not be rendered. Try again, or head back to the home page.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
