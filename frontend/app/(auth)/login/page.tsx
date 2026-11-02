import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Member login",
};

export default function LoginPage() {
  return (
    <section className="w-full max-w-md rounded-card border border-border bg-surface p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Member access</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Sign in to FORGE.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Authentication, email verification and mandatory staff 2FA arrive in Phase 1. This route
        exists now so the auth shell, layout and navigation are ready.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-background p-4 text-xs leading-relaxed text-subtle">
        Placeholder route — no credentials are accepted yet.
      </div>
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link href="/">Back to home</Link>
      </Button>
    </section>
  );
}
