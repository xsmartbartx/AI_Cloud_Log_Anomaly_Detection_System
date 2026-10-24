"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, History, ListChecks, Gauge, KeyRound, Settings, AlignLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/scan", label: "New scan", icon: ScanLine },
  { href: "/app/scans", label: "History", icon: History },
  { href: "/app/rules", label: "Rules", icon: ListChecks },
  { href: "/app/usage", label: "Usage and plan", icon: Gauge },
  { href: "/app/keys", label: "API keys", icon: KeyRound },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.href, n.label]));

export function AppShell({ org, user, children }: { org: string; user: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));
  const crumb = NAV.find(active);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-bg px-4">
        <Link href="/app" className="flex items-center gap-2 text-sm font-semibold">
          <AlignLeft className="size-4 text-accent" aria-hidden /> Linegist
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden sm:inline">{org}</span>
          <span className="rounded-pill bg-canvas px-2 py-1" style={{ borderRadius: 999 }}>{user}</span>
        </div>
      </header>
      <div className="mx-auto flex max-w-app flex-col md:flex-row">
        <nav aria-label="App" className="flex gap-1 overflow-x-auto border-b border-border bg-bg px-2 py-2 md:sticky md:top-12 md:h-[calc(100vh-48px)] md:w-60 md:shrink-0 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm",
                active(n) ? "bg-canvas font-semibold text-text" : "text-muted hover:bg-canvas hover:text-text",
              )}
            >
              <n.icon className="size-4" aria-hidden />
              {n.label}
            </Link>
          ))}
        </nav>
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-8">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
            <Link href="/app" className="hover:text-text">Linegist</Link>
            {crumb && crumb.href !== "/app" && <> / <span className="text-text">{TITLES[crumb.href]}</span></>}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
