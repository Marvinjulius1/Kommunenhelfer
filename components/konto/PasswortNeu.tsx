"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Eingabe } from "./Formularfeld";

export function PasswortNeu() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [neu, setNeu] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <Glass className="rounded-[24px] p-6">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/konto/passwort", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, neu }) });
          const d = await res.json().catch(() => ({}));
          if (res.ok) router.replace("/konto/anmelden");
          else setFehler(d.fehler === "link_ungueltig" ? "Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an." : "Bitte wählen Sie mindestens 10 Zeichen.");
        }}
      >
        <Eingabe id="pn-neu" label="Neues Passwort" type="password" autoComplete="new-password" hinweis="Mindestens 10 Zeichen" value={neu} onChange={(e) => setNeu(e.target.value)} />
        {fehler && (
          <p role="alert" className="text-[14px] text-danger">
            {fehler}
          </p>
        )}
        <Button type="submit">Passwort speichern</Button>
      </form>
    </Glass>
  );
}
