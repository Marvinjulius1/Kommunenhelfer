"use client";

/** Unterlagen-Check vor dem Termin: abhaken, was schon bereitliegt (nur auf diesem Gerät gespeichert). */
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { tx } from "@/lib/i18n";

export function UnterlagenCheck({ terminId, leistungId }: { terminId: string; leistungId?: string }) {
  const { tenant, lang } = useTenant();
  const de = lang === "de";
  const leistung = tenant.leistungen.find((l) => l.id === leistungId);
  const key = `unterlagen-check.${terminId}`;
  const [haken, setHaken] = useState<number[]>([]);
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    try {
      setHaken(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {}
  }, [key]);

  if (!leistung?.unterlagen.length) return null;
  const liste = leistung.unterlagen.map((u) => tx(u, lang));
  const alle = haken.length >= liste.length;

  const umschalten = (i: number) => {
    const neu = haken.includes(i) ? haken.filter((x) => x !== i) : [...haken, i];
    setHaken(neu);
    try {
      localStorage.setItem(key, JSON.stringify(neu));
    } catch {}
  };

  return (
    <div className="mt-4 rounded-[16px] bg-[var(--line)] px-4 py-3">
      <button type="button" aria-expanded={offen} onClick={() => setOffen(!offen)} className="flex w-full items-center justify-between gap-3 text-left text-[14px] font-medium">
        <span>{de ? "Unterlagen-Check" : "Document check"}</span>
        <span className={alle ? "text-success" : "text-subtle"}>
          {alle ? (de ? "Alles dabei" : "All set") : `${haken.length}/${liste.length}`}
        </span>
      </button>
      {offen && (
        <ul className="mt-3 space-y-2">
          {liste.map((u, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                <input type="checkbox" className="checkbox mt-0.5" checked={haken.includes(i)} onChange={() => umschalten(i)} />
                <span className={haken.includes(i) ? "text-subtle line-through" : ""}>{u}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
