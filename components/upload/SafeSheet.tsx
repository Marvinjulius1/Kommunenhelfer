"use client";

/**
 * Auswahl aus dem persönlichen Dokumentensafe (nur mit Bürgerkonto).
 * Die Dateien liegen bereits geprüft und verschlüsselt auf dem Server –
 * es wird nichts erneut aus dem Browser übertragen.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import type { SafeDatei } from "@/lib/client/uploads";
import { formatGroesse } from "@/lib/uploads/formate";
import { Sheet } from "./Sheet";

export function SafeSheet({ offen, onClose, onWahl }: { offen: boolean; onClose: () => void; onWahl: (d: SafeDatei) => void }) {
  const { lang } = useTenant();
  const de = lang === "de";
  const [liste, setListe] = useState<SafeDatei[] | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    if (!offen) return;
    setFehler(false);
    fetch("/api/konto/safe", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { dokumente: SafeDatei[] }) => setListe(d.dokumente))
      .catch(() => setFehler(true));
  }, [offen]);

  return (
    <Sheet offen={offen} onClose={onClose} titel={de ? "Aus meinem Dokumentensafe" : "From my document safe"}>
      <h2 className="text-[19px] font-semibold tracking-tight">{de ? "Aus meinem Dokumentensafe" : "From my document safe"}</h2>
      <p className="mt-1 text-[14px] text-muted">{de ? "Wählen Sie ein gespeichertes Dokument." : "Choose a saved document."}</p>
      <div className="mt-5 max-h-[50vh] overflow-y-auto">
        {fehler ? (
          <p className="text-[14px] text-muted">{de ? "Der Safe konnte nicht geladen werden." : "The safe could not be loaded."}</p>
        ) : liste === null ? (
          <p className="text-[14px] text-muted">{de ? "Wird geladen …" : "Loading …"}</p>
        ) : liste.length === 0 ? (
          <p className="text-[14px] text-muted">
            {de ? "Ihr Safe ist noch leer. " : "Your safe is empty. "}
            <Link href="/konto/dokumente" className="underline underline-offset-4">
              {de ? "Dokumente ablegen" : "Add documents"}
            </Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {liste.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    onWahl(d);
                    onClose();
                  }}
                  className="pressable flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left hover:bg-line"
                >
                  <Icon name="file" className="size-5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{d.name}</span>
                    <span className="block text-[12px] text-subtle">{formatGroesse(d.groesse, de ? "de" : "en")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={onClose} className="pressable mt-5 w-full rounded-full py-3 text-[15px] text-muted">
        {de ? "Abbrechen" : "Cancel"}
      </button>
    </Sheet>
  );
}
