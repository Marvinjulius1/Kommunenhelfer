/** Gemeinsame Bewegungsparameter – ruhig und federnd, wie bei Apple. */
import type { Transition, Variants } from "framer-motion";

export const spring: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };
export const softSpring: Transition = { type: "spring", stiffness: 170, damping: 26 };
export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

export const stagger = (delay = 0.06, start = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: start } },
});
