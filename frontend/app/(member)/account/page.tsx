export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Overview</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your training, in one place.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Upcoming bookings, waitlist position, membership status and pack credits will live here.
          The shell is ready; the data arrives with booking and billing phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Next booking
          </h2>
          <p className="mt-4 text-2xl font-bold text-subtle">No bookings yet</p>
          <p className="mt-2 text-sm text-muted">The class schedule lands in Phase 2.</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Membership
          </h2>
          <p className="mt-4 text-2xl font-bold text-subtle">Not connected</p>
          <p className="mt-2 text-sm text-muted">Stripe billing lands in Phase 3.</p>
        </div>
      </div>
    </div>
  );
}
