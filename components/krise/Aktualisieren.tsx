"use client";

/** Lage-Seite regelmäßig neu laden – ohne Neuladen der ganzen Seite. */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Aktualisieren({ sekunden = 60 }: { sekunden?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), sekunden * 1000);
    return () => clearInterval(t);
  }, [router, sekunden]);
  return null;
}
