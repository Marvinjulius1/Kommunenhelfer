"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Abmeldung per Link – erst nach Klick, damit E-Mail-Programme (Link-Vorschau) nicht versehentlich abmelden. */
export function Abmelden({ id, code }: { id: string; code: string }) {
  const [status, setStatus] = useState<"offen" | "ok" | "fehler">("offen");
  if (status === "ok") return <p role="status" className="text-[16px]">Sie sind abgemeldet. Vielen Dank für die Rückmeldung.</p>;
  return (
    <div className="space-y-3">
      <Button
        onClick={async () => {
          const r = await fetch("/api/veranstaltungen/abmelden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, code }) });
          setStatus(r.ok ? "ok" : "fehler");
        }}
      >
        Jetzt abmelden
      </Button>
      {status === "fehler" && (
        <p role="alert" className="text-[14px] text-danger">
          Der Link ist ungültig oder abgelaufen.
        </p>
      )}
    </div>
  );
}
