import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "glass" | "quiet";

const base =
  "pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium tracking-[-0.01em] select-none disabled:cursor-not-allowed disabled:opacity-50";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-on-accent",
  glass: "glass text-fg",
  quiet: "text-accent",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
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
