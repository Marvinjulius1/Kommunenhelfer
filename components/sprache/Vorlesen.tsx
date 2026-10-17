"use client";

/** Kleiner Knopf „Vorlesen“ – liest einen Text oder den Inhalt eines Bereichs vor. */
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { LOCALE } from "@/lib/i18n";
import { kannVorlesen, useVorlesen } from "@/lib/client/sprache";

export function Vorlesen({ text, ziel, className = "" }: { text?: string; ziel?: string; className?: string }) {
  const { tenant, lang, t } = useTenant();
  const { spricht, vorlesen, stopp } = useVorlesen(LOCALE[lang]);
  const [moeglich, setMoeglich] = useState(false);
  useEffect(() => setMoeglich(kannVorlesen()), []);
  if (!moeglich || !aktiv(tenant, "vorlesen")) return null;

  const los = () => {
    if (spricht) return stopp();
    const inhalt = text ?? (ziel ? (document.querySelector<HTMLElement>(ziel)?.innerText ?? "") : "");
    if (inhalt) vorlesen(inhalt);
  };

  return (
    <button
      type="button"
      onClick={los}
      aria-pressed={spricht}
      className={`pressable inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] text-muted hover:text-fg ${className}`}
    >
      <Icon name={spricht ? "close" : "speaker"} className="size-4" />
      {spricht ? t.vorlesenStopp : t.vorlesen}
    </button>
  );
}
