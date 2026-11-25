import Link from "next/link";
import { Suspense } from "react";
import { requireContractor } from "@/lib/auth/current";
import { runtimeMode } from "@/lib/env";
import { loadWorkspace } from "@/lib/workspace";
import { logout } from "@/server/actions";
import { Wordmark } from "@/components/wordmark";

export const instant = false;

const LINKS = [
  ["/app", "Subs"],
  ["/app/import", "Import"],
  ["/app/report", "Uncovered dollars"],
  ["/app/reminders", "Reminders"],
  ["/app/packet", "Audit packet"],
  ["/app/settings", "Requirements"],
  ["/app/billing", "Billing"],
];

async function Shell({ children }: { children: React.ReactNode }) {
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const mode = runtimeMode();
  return (
    <div className="min-h-screen">
      {mode.data === "local" ? (
        <p className="bg-ink px-4 py-2 text-center text-xs text-sheet">
          Local demo · email stays in the outbox · checkout is simulated
          {mode.demoToday ? ` · today is frozen at ${mode.demoToday}` : ""}
        </p>
      ) : null}
      <header className="border-b border-line bg-sheet/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Wordmark href="/app" />
            <div>
              <p className="text-sm font-semibold">{contractor.companyName}</p>
              <p className="text-xs text-ink-soft">{workspace.access.label}</p>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm font-semibold text-ink-soft">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-paper">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-ink-soft">Opening the workspace…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
