export const metadata = {
  title: "Staff dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Dashboard</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Run the floor.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Role-aware navigation, today&apos;s sessions, rosters and attendance will appear here.
          Access is enforced by the API — hiding a link is never the guard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Today's sessions", "Phase 2"],
          ["Roster & attendance", "Phase 2"],
          ["Members & credits", "Phase 3–4"],
        ].map(([label, phase]) => (
          <div key={label} className="rounded-card border border-border bg-surface p-6">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-subtle">{phase}</p>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-dashed border-border bg-surface/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Phase 0 status
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtle">
          This page proves the dashboard route group and design tokens. Authentication, RBAC and
          the real overview are Phase 1 work.
        </p>
      </div>
    </div>
  );
}
