/**
 * Glasfläche: feine Border, weicher Schatten, Lichtkante oben.
 * Rein statisch – keine Zeiger-Effekte (ruhiger, schneller).
 */
import { forwardRef, type HTMLAttributes } from "react";

export const Glass = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Glass({ className = "", ...rest }, ref) {
  return <div ref={ref} className={`glass ${className}`} {...rest} />;
});
