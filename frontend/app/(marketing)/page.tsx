import { ArrowRight, CalendarCheck, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: CalendarCheck,
    title: "Book the room",
    body: "Dated sessions, live capacity, automatic waitlist promotion and a cancellation cutoff that is enforced by the server.",
  },
  {
    icon: CreditCard,
    title: "Money that adds up",
    body: "Stripe subscriptions, class packs and drop-ins with server-side prices, idempotent webhooks and a credit ledger.",
  },
  {
    icon: ShieldCheck,
    title: "Roles with teeth",
    body: "Coach, admin and superadmin access enforced on the API, mandatory 2FA for privileged accounts and an append-only audit trail.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 size-125 -translate-y-1/2 rounded-full bg-accent/8 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Phase 0 · Foundation
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            Train with <span className="text-accent">intent.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            One room, real coaching and a platform built around the way a strength club actually
            runs — from the first free-week enquiry to the last spot in a Friday class.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Member login
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Staff dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Under the hood
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              The shell is live. The hard parts come next.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Phase 0 wires the monorepo-free layout, shared contracts, database, health check and
            CI. Features land one phase at a time.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-card border border-border bg-surface p-6 transition-colors hover:border-accent/40"
            >
              <span className="grid size-10 place-items-center rounded-full border border-border bg-surface-raised text-accent">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
