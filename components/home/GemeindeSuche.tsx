"use client";

/** Kreisportal: Gemeinde nach Postleitzahl oder Name finden. */
import { useState } from "react";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

export function GemeindeSuche({ gemeinden }: { gemeinden: { name: string; plz: string[]; url: string; portal: boolean }[] }) {
  const [q, setQ] = useState("");
  const n = q.trim().toLowerCase();
  const liste = gemeinden.filter((g) => !n || g.plz.some((p) => p.startsWith(n)) || g.name.toLowerCase().includes(n));
  return (
    <div>
      <label htmlFor="gemeinde-q" className="text-[14px] font-medium">
        Postleitzahl oder Name
      </label>
      <input id="gemeinde-q" className="field-input mt-1" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="postal-code" placeholder="z. B. 12345" />
      <ul className="mt-6 space-y-2" aria-live="polite">
        {liste.map((g) => (
          <li key={g.name}>
            <a href={g.url} className="block rounded-[20px]" {...(g.portal ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
              <Glass className="pressable flex items-center justify-between gap-4 rounded-[20px] px-5 py-4">
                <span>
                  <span className="block text-[16px] font-medium">{g.name}</span>
                  <span className="text-[13px] text-subtle">
                    {g.plz.join(", ")} · {g.portal ? "Bürgerportal" : "Website der Gemeinde"}
                  </span>
                </span>
                <Icon name={g.portal ? "chevronRight" : "external"} className="size-4 shrink-0 text-subtle rtl:-scale-x-100" />
              </Glass>
            </a>
          </li>
        ))}
        {!liste.length && <li className="text-[15px] text-muted">Keine Gemeinde gefunden. Bitte prüfen Sie die Postleitzahl.</li>}
      </ul>
    </div>
  );
}
