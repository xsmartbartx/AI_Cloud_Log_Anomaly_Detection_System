"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else setError(data.message ?? "Could not open billing.");
    } catch { setError("Could not reach billing. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-6">
      <Button variant="secondary" onClick={open} loading={busy}>Manage billing or cancel</Button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
