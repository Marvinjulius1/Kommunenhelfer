"use client";

/**
 * Globale Client-Provider.
 * MotionConfig reducedMotion="user": Bei prefers-reduced-motion werden
 * Transform-Animationen abgeschaltet, Opacity-Übergänge bleiben.
 */
import { MotionConfig } from "framer-motion";
import { uebergang } from "@/lib/motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={uebergang.mittel}>
      {children}
    </MotionConfig>
  );
}
