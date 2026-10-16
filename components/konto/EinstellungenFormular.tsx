"use client";

/** Benachrichtigungen und persönliche Einstellungen. */
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Glass } from "@/components/ui/Glass";
import type { Einstellungen } from "@/lib/konto/types";
import { aktiv } from "@/lib/funktionen";
import { pushAbbestellen, pushAbonnieren, pushMoeglich } from "@/lib/client/push";

export function EinstellungenFormular({ start, bezirke, ortsteile }: { start: Einstellungen; bezirke: { id: string; name: string }[]; ortsteile: string[] }) {
  const { tenant } = useTenant();
  const [e, setE] = useState(start);
  const [meldung, setMeldung] = useState<string | null>(null);
  // erst im Browser prüfen – sonst unterscheidet sich die Server-Ausgabe (Hydration)
  const [pushOk, setPushOk] = useState(true);
  useEffect(() => setPushOk(pushMoeglich()), []);

  const speichern = async (neu: Partial<Einstellungen>) => {
    const ziel = { ...e, ...neu };
    setE(ziel);
    // undefined würde in JSON wegfallen – null entfernt eine Auswahl
    const body = Object.fromEntries(Object.entries(neu).map(([k, v]) => [k, v === undefined ? null : v]));
    const res = await fetch("/api/konto/einstellungen", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMeldung(res.ok ? "Gespeichert." : "Das hat nicht geklappt.");
  };

  const pushUmschalten = async (an: boolean) => {
    if (an) {
      const themen: ("konto" | "abfall" | "meldungen")[] = ["konto", "meldungen", ...(e.abfallErinnerung && e.abfallBezirk ? (["abfall"] as const) : [])];
      const r = await pushAbonnieren(themen, { abfallBezirk: e.abfallBezirk, ortsteil: e.ortsteil });
      if (r !== "ok") {
        setMeldung(r === "abgelehnt" ? "Bitte erlauben Sie Benachrichtigungen in Ihrem Browser." : "Push-Benachrichtigungen sind auf diesem Gerät nicht verfügbar.");
        return;
      }
    } else await pushAbbestellen();
    await speichern({ pushBenachrichtigung: an });
  };

  const Schalter = ({ id, label, hinweis, an, onChange, disabled }: { id: string; label: string; hinweis?: string; an: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-4">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {hinweis && <span className="mt-1 block text-[13px] text-subtle">{hinweis}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" className="checkbox mt-1" checked={an} disabled={disabled} onChange={(ev) => onChange(ev.target.checked)} />
    </label>
  );

  return (
    <div className="space-y-4">
      <Glass className="divide-y divide-[var(--line)] rounded-[24px] px-6">
        <Schalter id="e-mail" label="E-Mail-Benachrichtigungen" hinweis="Hinweis bei neuen Bescheiden, Rückfragen und Statusänderungen – ohne Inhalte." an={e.emailBenachrichtigung} onChange={(v) => speichern({ emailBenachrichtigung: v })} />
        {aktiv(tenant, "push") && (
          <Schalter
            id="e-push"
            label="Push-Benachrichtigungen"
            hinweis={pushOk ? "Auch wenn das Portal geschlossen ist. Am besten nach „Zum Home-Bildschirm hinzufügen“." : "Auf diesem Gerät nicht verfügbar."}
            an={e.pushBenachrichtigung}
            onChange={pushUmschalten}
            disabled={!pushOk}
          />
        )}
      </Glass>
      {(bezirke.length > 0 || ortsteile.length > 0) && (
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Mein Wohnort</h2>
          <p className="mt-1 text-[13px] text-subtle">Für Abfallkalender und Meldungen wie Straßensperrungen in Ihrer Nähe.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {bezirke.length > 0 && (
              <label className="text-[14px] font-medium">
                Abfuhrbezirk
                <select className="field-input mt-1" value={e.abfallBezirk ?? ""} onChange={(ev) => speichern({ abfallBezirk: ev.target.value || undefined })}>
                  <option value="">Bitte wählen</option>
                  {bezirke.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {ortsteile.length > 0 && (
              <label className="text-[14px] font-medium">
                Ortsteil
                <select className="field-input mt-1" value={e.ortsteil ?? ""} onChange={(ev) => speichern({ ortsteil: ev.target.value || undefined })}>
                  <option value="">Alle Meldungen</option>
                  {ortsteile.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {bezirke.length > 0 && (
            <div className="mt-2 border-t border-[var(--line)]">
              <Schalter id="e-abfall" label="Erinnerung am Abend vor der Abfuhr" an={e.abfallErinnerung} onChange={(v) => speichern({ abfallErinnerung: v })} disabled={!e.abfallBezirk} />
            </div>
          )}
        </Glass>
      )}
      <p role="status" className="text-[14px] text-muted">
        {meldung}
      </p>
    </div>
  );
}
