"use client";

/**
 * Glasfläche mit Lichtreflex, der dem Zeiger sanft folgt.
 * Bei prefers-reduced-motion oder Touch-Geräten bleibt der Reflex statisch.
 */
import { forwardRef, useEffect, useRef, type HTMLAttributes } from "react";

export function useSpecular<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Gedämpft: Der Reflex bewegt sich nur ein Stück in Richtung Zeiger.
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--mx", `${30 + (x - 30) * 0.45}%`);
        el.style.setProperty("--my", `${-20 + (y + 20) * 0.35}%`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return ref;
}

type Props = HTMLAttributes<HTMLDivElement> & { strong?: boolean; interactive?: boolean };

export const Glass = forwardRef<HTMLDivElement, Props>(function Glass({ className = "", strong, interactive, ...rest }, fwd) {
  const ref = useSpecular<HTMLDivElement>();
  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof fwd === "function") fwd(node);
        else if (fwd) fwd.current = node;
      }}
      className={`glass ${strong ? "glass-strong" : ""} ${interactive ? "glass-interactive" : ""} ${className}`}
      {...rest}
    />
  );
});
