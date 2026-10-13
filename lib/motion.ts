/**
 * Motion-System – die EINZIGE Stelle für Dauer, Easing und Federn.
 * (CSS-Gegenstück: --dauer-* und --ease-standard in app/globals.css)
 *
 * Regeln:
 *  - Animiert werden nur transform und opacity (keine Layout-Reflows).
 *  - Bei prefers-reduced-motion sorgt <MotionConfig reducedMotion="user">
 *    dafür, dass nur noch Opacity-Übergänge stattfinden.
 */
import type { Transition, Variants } from "framer-motion";

export const dauer = { kurz: 0.16, mittel: 0.28, lang: 0.48 } as const;

export const easing = {
  /** Standard: schnell starten, weich auslaufen */
  standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;

export const feder = {
  /** Für Layout-Übergänge (Startseite → Gespräch) */
  layout: { type: "spring", stiffness: 260, damping: 34, mass: 1 } satisfies Transition,
  /** Für kleine Elemente (Chips, Buttons, Popover) */
  klein: { type: "spring", stiffness: 420, damping: 36 } satisfies Transition,
} as const;

export const uebergang = {
  kurz: { duration: dauer.kurz, ease: easing.standard } satisfies Transition,
  mittel: { duration: dauer.mittel, ease: easing.standard } satisfies Transition,
  lang: { duration: dauer.lang, ease: easing.standard } satisfies Transition,
} as const;

/** Sanftes Einblenden: Opacity + minimale Verschiebung. */
export const einblenden: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: uebergang.mittel },
};

export const gestaffelt = (abstand = 0.05, start = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: abstand, delayChildren: start } },
});

/** Seitenwechsel innerhalb eines Ablaufs (Formularschritte). */
export const schrittwechsel: Variants = {
  enter: (richtung: number) => ({ opacity: 0, x: richtung * 16 }),
  center: { opacity: 1, x: 0, transition: uebergang.mittel },
  exit: (richtung: number) => ({ opacity: 0, x: richtung * -16, transition: uebergang.kurz }),
};
