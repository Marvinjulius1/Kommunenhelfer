"use client";

/** Persönliche Daten bearbeiten. Beim Online-Ausweis sind Name und Geburtsdatum geprüft und gesperrt. */
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import type { Profil } from "@/lib/konto/types";
import { Eingabe, sichererPfad } from "./Formularfeld";

export function ProfilFormular({ profil, geprueft }: { profil: Profil; geprueft: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const neu = sp.get("neu") === "1";
  const weiter = sichererPfad(sp.get("weiter"), "");
  const [p, setP] = useState<Profil>(profil);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);
  const set = (k: keyof Profil) => (e: React.ChangeEvent<HTMLInputElement>) => setP((x) => ({ ...x, [k]: e.target.value }));

  const speichern = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaedt(true);
    setMeldung(null);
    const res = await fetch("/api/konto/profil", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    setLaedt(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const t: Record<string, string> = {
        iban: "Diese IBAN ist nicht gültig. Bitte prüfen Sie die Eingabe.",
        email_vergeben: "Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.",
      };
      setMeldung({ ok: false, text: t[d.fehler] ?? "Bitte prüfen Sie Ihre Eingaben." });
      return;
    }
    setMeldung({ ok: true, text: "Gespeichert." });
    router.refresh();
    if (weiter) router.push(weiter);
  };

  return (
    <form onSubmit={speichern} noValidate className="space-y-4">
      {neu && (
        <p className="text-[15px] text-muted">Willkommen! Bitte ergänzen Sie Ihre E-Mail-Adresse – dorthin senden wir Bestätigungen und Bescheide.</p>
      )}
      <Glass className="rounded-[24px] p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Person</h2>
        {geprueft && <p className="mb-4 text-[13px] text-subtle">Name und Geburtsdatum stammen aus Ihrem Online-Ausweis und sind geprüft.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Eingabe id="p-vorname" label="Vorname" autoComplete="given-name" value={p.vorname} onChange={set("vorname")} disabled={geprueft} />
          <Eingabe id="p-nachname" label="Nachname" autoComplete="family-name" value={p.nachname} onChange={set("nachname")} disabled={geprueft} />
          <Eingabe id="p-geburtsdatum" label="Geburtsdatum" type="date" autoComplete="bday" value={p.geburtsdatum ?? ""} onChange={set("geburtsdatum")} disabled={geprueft} />
        </div>
      </Glass>
      <Glass className="rounded-[24px] p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Anschrift und Kontakt</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Eingabe id="p-strasse" label="Straße und Hausnummer" autoComplete="street-address" value={p.strasse ?? ""} onChange={set("strasse")} />
          </div>
          <Eingabe id="p-plz" label="Postleitzahl" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={p.plz ?? ""} onChange={set("plz")} />
          <Eingabe id="p-ort" label="Ort" autoComplete="address-level2" value={p.ort ?? ""} onChange={set("ort")} />
          <Eingabe id="p-email" label="E-Mail-Adresse" type="email" autoComplete="email" value={p.email} onChange={set("email")} />
          <Eingabe id="p-telefon" label="Telefon (freiwillig)" type="tel" autoComplete="tel" value={p.telefon ?? ""} onChange={set("telefon")} />
        </div>
      </Glass>
      <Glass className="rounded-[24px] p-6">
        <h2 className="mb-1 text-[17px] font-semibold">Bankverbindung (freiwillig)</h2>
        <p className="mb-4 text-[13px] text-subtle">Für Lastschriften, z. B. Hundesteuer. Wird verschlüsselt gespeichert und nur in Formularen vorgeschlagen.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Eingabe id="p-kontoinhaber" label="Kontoinhaber/in" autoComplete="cc-name" value={p.kontoinhaber ?? ""} onChange={set("kontoinhaber")} />
          <Eingabe id="p-iban" label="IBAN" className="field-input mt-1 font-mono" value={p.iban ?? ""} onChange={set("iban")} spellCheck={false} />
        </div>
      </Glass>
      <Glass className="rounded-[24px] p-6">
        <h2 className="mb-1 text-[17px] font-semibold">Personalausweis (freiwillig)</h2>
        <p className="mb-4 text-[13px] text-subtle">Wir erinnern Sie rechtzeitig vor Ablauf und informieren Sie, sobald ein neuer Ausweis abholbereit ist.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Eingabe id="p-ausweis-bis" label="Gültig bis" type="date" value={p.ausweisGueltigBis ?? ""} onChange={set("ausweisGueltigBis")} />
          <Eingabe id="p-ausweis-antrag" label="Antragsnummer eines neuen Ausweises" hinweis="Steht auf Ihrer Antragsquittung." value={p.ausweisAntragsnummer ?? ""} onChange={set("ausweisAntragsnummer")} />
        </div>
      </Glass>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={laedt}>
          {laedt ? "Wird gespeichert …" : "Speichern"}
        </Button>
        {meldung && (
          <p role={meldung.ok ? "status" : "alert"} className={`text-[14px] ${meldung.ok ? "text-success" : "text-danger"}`}>
            {meldung.text}
          </p>
        )}
      </div>
    </form>
  );
}
