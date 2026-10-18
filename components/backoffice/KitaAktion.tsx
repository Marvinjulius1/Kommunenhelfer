"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function KitaAktion({ id, kitaId, anbietenMoeglich }: { id: string; kitaId: string; anbietenMoeglich: boolean }) {
  const router = useRouter();
  const [laedt, setLaedt] = useState(false);
  const los = async (aktion: "anbieten" | "absagen") => {
    if (aktion === "absagen" && !confirm("Diesem Kind wirklich absagen?")) return;
    setLaedt(true);
    const r = await fetch("/api/backoffice/kita", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kitaId, aktion }) });
    setLaedt(false);
    if (r.ok) router.refresh();
    else alert("Das hat nicht geklappt.");
  };
  return (
    <span className="inline-flex gap-1">
      {anbietenMoeglich && (
        <button type="button" disabled={laedt} onClick={() => los("anbieten")} className="pressable rounded-full bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent">
          Platz anbieten
        </button>
      )}
      <button type="button" disabled={laedt} onClick={() => los("absagen")} className="pressable rounded-full px-3 py-1.5 text-[13px] text-muted">
        Absagen
      </button>
    </span>
  );
}
