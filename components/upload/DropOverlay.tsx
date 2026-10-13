"use client";

/** Ruhiges Overlay beim Ziehen von Dateien auf die Seite. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { uebergang } from "@/lib/motion";

export function DropOverlay({ onDateien, aktiv }: { onDateien: (f: File[]) => void; aktiv: boolean }) {
  const { lang } = useTenant();
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    if (!aktiv) return;
    let tiefe = 0;
    const hatDateien = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hatDateien(e)) return;
      e.preventDefault();
      tiefe++;
      setSichtbar(true);
    };
    const over = (e: DragEvent) => hatDateien(e) && e.preventDefault();
    const leave = (e: DragEvent) => {
      if (!hatDateien(e)) return;
      tiefe = Math.max(0, tiefe - 1);
      if (!tiefe) setSichtbar(false);
    };
    const drop = (e: DragEvent) => {
      if (!hatDateien(e)) return;
      e.preventDefault();
      tiefe = 0;
      setSichtbar(false);
      onDateien([...(e.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [aktiv, onDateien]);

  return (
    <AnimatePresence>
      {sichtbar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={uebergang.mittel}
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] p-6"
          aria-hidden="true"
        >
          <div className="glass flex flex-col items-center gap-4 rounded-[32px] px-12 py-10 text-center">
            <Icon name="upload" className="size-8 text-muted" />
            <p className="text-[17px] font-medium">{lang === "de" ? "Dateien hier ablegen" : "Drop files here"}</p>
            <p className="text-[13px] text-subtle">PDF, JPG, PNG, HEIC</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
