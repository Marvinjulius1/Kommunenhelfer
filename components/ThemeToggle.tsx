"use client";

import { useEffect, useState } from "react";
import { useTenant } from "./TenantProvider";

type Pref = "light" | "dark" | "system";

function anwenden(pref: Pref) {
  const dunkel = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  const setzen = () => {
    root.dataset.theme = dunkel ? "dark" : "light";
    root.dataset.themePref = pref;
  };
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Sanfter Übergang: View Transitions API, sonst CSS-Transition.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!reduziert && doc.startViewTransition) {
    doc.startViewTransition(setzen);
  } else {
    root.classList.add("theme-anim");
    setzen();
    window.setTimeout(() => root.classList.remove("theme-anim"), 550);
  }
}

export function ThemeToggle() {
  const { t } = useTenant();
  const [dunkel, setDunkel] = useState<boolean | null>(null);

  useEffect(() => {
    setDunkel(document.documentElement.dataset.theme === "dark");
    // Folgt der Systemeinstellung, solange nichts manuell gewählt wurde.
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let pref: Pref = "system";
      try {
        pref = (localStorage.getItem("theme") as Pref) || "system";
      } catch {}
      if (pref === "system") {
        anwenden("system");
        setDunkel(mq.matches);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const umschalten = () => {
    const neu: Pref = dunkel ? "light" : "dark";
    // Entspricht die Wahl dem System, merken wir "system" – so bleibt es automatisch.
    const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const speichern: Pref = neu === system ? "system" : neu;
    try {
      localStorage.setItem("theme", speichern);
    } catch {}
    anwenden(neu);
    setDunkel(!dunkel);
  };

  return (
    <button
      type="button"
      onClick={umschalten}
      aria-label={dunkel ? t.themeHell : t.themeDunkel}
      title={t.themeWechseln}
      className="glass glass-interactive grid size-10 place-items-center rounded-full text-fg"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        {/* Sonne / Mond als ruhige Linien-Icons; Wechsel per Opazität */}
        <g style={{ opacity: dunkel ? 0 : 1, transition: "opacity .4s" }}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          style={{ opacity: dunkel ? 1 : 0, transition: "opacity .4s" }}
        />
      </svg>
    </button>
  );
}
