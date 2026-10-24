import Link from "next/link";
import { AlignLeft } from "lucide-react";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <AlignLeft className="size-5 text-accent" aria-hidden />
      Linegist
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-[52px] max-w-content items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link className="hidden rounded-md px-3 py-1.5 text-muted hover:text-text sm:block" href="/#how">How it works</Link>
          <Link className="rounded-md px-3 py-1.5 text-muted hover:text-text" href="/pricing">Pricing</Link>
          <Link className="rounded-md px-3 py-1.5 text-muted hover:text-text" href="/docs">Docs</Link>
          <Link href="/go" className="ml-2 rounded-md bg-accent px-3 py-1.5 font-semibold text-on-accent hover:bg-accent-hover">Open Linegist</Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
        <p>Linegist is a NEXORA product. Beta.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://onenexora.com" className="hover:text-text">NEXORA</a>
          <a href="https://status.onenexora.com" className="hover:text-text">Status</a>
          <a href="https://onenexora.com/legal/privacy" className="hover:text-text">Privacy</a>
          <a href="https://onenexora.com/legal/terms" className="hover:text-text">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
