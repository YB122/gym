import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-12">
      {children}
    </main>
  );
}
