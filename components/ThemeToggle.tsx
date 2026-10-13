"use client";

/**
 * Hell/Dunkel-Schalter.
 * Das Icon wird per CSS aus data-theme abgeleitet – dadurch kein
 * Hydration-Unterschied und kein Aufflackern beim Laden.
 */
import { useEffect } from "react";
import { useTenant } from "./TenantProvider";
import { Icon } from "./ui/Icon";

type Pref = "light" | "dark" | "system";
const mq = () => matchMedia("(prefers-color-scheme: dark)");

function anwenden(dunkel: boolean, pref: Pref) {
  const root = document.documentElement;
  const setzen = () => {
    root.dataset.theme = dunkel ? "dark" : "light";
    root.dataset.themePref = pref;
  };
  // Weicher Übergang über View Transitions (Opacity-Überblendung). Ohne Unterstützung: sofort.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(setzen);
  else setzen();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useTenant();

  // Folgt der Systemeinstellung, solange nichts manuell gewählt wurde.
  useEffect(() => {
    const m = mq();
    const onChange = () => {
      if ((document.documentElement.dataset.themePref ?? "system") === "system") anwenden(m.matches, "system");
    };
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  const umschalten = () => {
    const dunkel = document.documentElement.dataset.theme !== "dark";
    // Entspricht die Wahl dem System, merken wir "system" – so bleibt es automatisch.
    const pref: Pref = dunkel === mq().matches ? "system" : dunkel ? "dark" : "light";
    try {
      localStorage.setItem("theme", pref);
    } catch {}
    anwenden(dunkel, pref);
  };

  return (
    <button
      type="button"
      onClick={umschalten}
      aria-label={t.themeWechseln}
      title={t.themeWechseln}
      className={`pressable grid size-10 place-items-center rounded-full text-subtle hover:text-fg ${className}`}
    >
      <span className="dark:hidden">
        <Icon name="moon" className="size-[18px]" />
      </span>
      <span className="hidden dark:inline">
        <Icon name="sun" className="size-[18px]" />
      </span>
    </button>
  );
}
