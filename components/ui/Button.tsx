"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useSpecular } from "./Glass";

type Variant = "primary" | "glass" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium tracking-[-0.01em] select-none disabled:cursor-not-allowed disabled:opacity-50";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[0_1px_1px_rgb(0_0_0/0.08),0_8px_20px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-[transform,box-shadow,filter] duration-300 ease-[var(--ease-spring)] hover:brightness-[1.06] active:scale-[0.98]",
  glass: "glass glass-interactive text-fg",
  quiet: "text-accent hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const ref = useSpecular<HTMLButtonElement>();
  return <button ref={ref} className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${styles[variant]} ${className}`}>
        {children}
        <span className="sr-only"> (öffnet in neuem Fenster)</span>
      </a>
    );
  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
