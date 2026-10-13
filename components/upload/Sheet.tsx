"use client";

/**
 * Modales Blatt (Dialog) im Glas-Stil – barrierefrei:
 * role="dialog", aria-modal, Fokus wird hineingesetzt und gehalten, Escape schließt.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { feder, uebergang } from "@/lib/motion";

export function Sheet({ offen, onClose, titel, children }: { offen: boolean; onClose: () => void; titel: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const vorher = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f.at(-1)!.focus();
      } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      vorher?.focus?.();
    };
  }, [offen, onClose]);

  return (
    <AnimatePresence>
      {offen && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={uebergang.mittel}>
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--bg)_70%,transparent)]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={titel}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={feder.layout}
            className="glass relative w-full max-w-md rounded-[32px] p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
