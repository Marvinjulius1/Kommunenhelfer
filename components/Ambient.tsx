"use client";

/**
 * Ruhiger Hintergrund mit weichen Lichtflächen und leichtem Parallax.
 * Rein dekorativ (aria-hidden).
 */
import { useEffect, useRef } from "react";

export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * 1.2).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * 1.2).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return (
    <div ref={ref} className="ambient" aria-hidden="true">
      <span className="a" />
      <span className="b" />
      <span className="c" />
    </div>
  );
}
