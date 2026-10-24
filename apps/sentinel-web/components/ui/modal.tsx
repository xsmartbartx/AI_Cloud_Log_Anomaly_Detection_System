"use client";
import { useEffect, useRef } from "react";
import { Button } from "./button";

/** Native <dialog>: focus trap, Esc to close and inert background come from the browser. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="w-full max-w-md rounded-lg border border-border bg-bg p-6 text-text shadow-pop backdrop:bg-black/40"
    >
      <h2 id="modal-title" className="text-lg">{title}</h2>
      <div className="mt-3 text-sm">{children}</div>
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </dialog>
  );
}
