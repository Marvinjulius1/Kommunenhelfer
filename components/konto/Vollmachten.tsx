"use client";

/** Vollmachten erteilen und annehmen, für andere handeln, Unternehmenskonten verwalten. */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

type Umfang = "antraege" | "termine" | "post" | "zahlungen";
interface V {
  id: string;
  art: "vollmacht" | "organisation";
  rolle?: "inhaber" | "mitarbeiter";
  umfang: Umfang[];
  bis?: string;
  status: "offen" | "aktiv" | "widerrufen";
  vonName: string;
  anName?: string;
  anEmail?: string;
  seit: string;
}
interface Daten {
  erteilt: V[];
  erhalten: V[];
  organisationen: (V & { orgId: string; mitglieder?: V[] })[];
  aktiv: string | null;
  protokoll: { aktion: string; details?: string; am: string }[];
}

const UMFANG: Record<Umfang, string> = { antraege: "Anträge und Anliegen", termine: "Termine", post: "Bescheide und Nachrichten lesen", zahlungen: "Gebühren bezahlen" };
const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T12:00:00Z"));
const post = (body: object) => fetch("/api/konto/vollmachten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function Vollmachten({ annehmen }: { annehmen?: string }) {
  const router = useRouter();
  const [d, setD] = useState<Daten | null>(null);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [formular, setFormular] = useState<"" | "vollmacht" | "firma">("");
  const [einladen, setEinladen] = useState<string | null>(null);

  const laden = useCallback(async () => {
    const r = await fetch("/api/konto/vollmachten", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => {
    void laden();
  }, [laden]);

  const aktion = async (body: object, ok: string, danach?: () => void) => {
    setMeldung(null);
    const r = await post(body);
    const x = await r.json().catch(() => ({}));
    const fehler: Record<string, string> = {
      eigene_vollmacht: "Das ist Ihre eigene Einladung – sie muss von der anderen Person angenommen werden.",
      ungueltig: "Die Einladung ist ungültig, abgelaufen oder schon angenommen.",
      letzter_inhaber: "Ein Unternehmen braucht mindestens eine Inhaberin oder einen Inhaber.",
      zu_viele_anfragen: "Bitte versuchen Sie es später erneut.",
    };
    setMeldung(r.ok ? { ok: true, text: typeof ok === "string" ? ok.replace("{name}", x.vonName ?? x.name ?? "") : ok } : { ok: false, text: fehler[x.fehler] ?? "Bitte prüfen Sie Ihre Angaben." });
    if (r.ok) {
      danach?.();
      await laden();
      router.refresh();
    }
    return r.ok;
  };

  const handeln = (id: string | null) => aktion({ aktion: "wechseln", id }, id ? "Sie handeln jetzt für {name}." : "Sie handeln wieder für sich selbst.", () => id && router.push("/meine-anliegen"));

  if (!d) return null;
  const ichHandle = [...d.erhalten, ...d.organisationen];

  return (
    <div className="space-y-10">
      {annehmen && (
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Einladung annehmen</h2>
          <p className="mt-1 text-[14px] text-muted">Mit der Annahme können Sie im Rahmen der Vollmacht für die einladende Person bzw. das Unternehmen handeln. Alles, was Sie tun, ist für sie nachvollziehbar.</p>
          <Button className="mt-4" onClick={() => aktion({ aktion: "annehmen", token: annehmen }, "Angenommen. Sie können jetzt für {name} handeln.", () => router.replace("/konto/vollmachten"))}>
            Annehmen
          </Button>
        </Glass>
      )}

      <section aria-labelledby="h-handeln">
        <h2 id="h-handeln" className="text-[20px] font-semibold tracking-tight">
          Für andere handeln
        </h2>
        {ichHandle.length ? (
          <ul className="mt-4 space-y-2">
            {d.aktiv && (
              <li>
                <Glass className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-4">
                  <span className="text-[15px]">Für mich selbst</span>
                  <Button variant="glass" className="!min-h-10 px-4 text-[14px]" onClick={() => handeln(null)}>
                    Zurück zu meinem Konto
                  </Button>
                </Glass>
              </li>
            )}
            {ichHandle.map((v) => (
              <li key={v.id}>
                <Glass className={`flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-4 ${d.aktiv === v.id ? "ring-2 ring-accent" : ""}`}>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[15px] font-medium">
                      <Icon name={v.art === "organisation" ? "home" : "users"} className="size-4" />
                      {v.vonName}
                    </span>
                    <span className="block text-[13px] text-subtle">
                      {v.art === "organisation" ? (v.rolle === "inhaber" ? "Unternehmen · Inhaber/in" : "Unternehmen · Mitarbeiter/in") : `Vollmacht: ${v.umfang.map((u) => UMFANG[u]).join(", ")}${v.bis ? ` · bis ${datum(v.bis)}` : ""}`}
                    </span>
                  </span>
                  {d.aktiv === v.id ? (
                    <span className="text-[14px] font-medium text-accent">Aktiv</span>
                  ) : (
                    <Button className="!min-h-10 px-4 text-[14px]" onClick={() => handeln(v.id)}>
                      Für {v.art === "organisation" ? "das Unternehmen" : v.vonName.split(" ")[0]} handeln
                    </Button>
                  )}
                </Glass>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-muted">Ihnen wurde noch keine Vollmacht erteilt. Eine Einladung kommt per E-Mail.</p>
        )}
      </section>

      <section aria-labelledby="h-erteilt">
        <h2 id="h-erteilt" className="text-[20px] font-semibold tracking-tight">
          Meine Vollmachten an andere
        </h2>
        <p className="mt-1 text-[14px] text-muted">Zum Beispiel für Ihre Tochter, Ihren Sohn oder eine Betreuungsperson.</p>
        {d.erteilt.length > 0 && (
          <ul className="mt-4 space-y-2">
            {d.erteilt.map((v) => (
              <li key={v.id}>
                <Glass className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-4">
                  <span>
                    <span className="block text-[15px] font-medium">{v.anName}</span>
                    <span className="block text-[13px] text-subtle">
                      {v.status === "offen" ? `Einladung an ${v.anEmail} – noch nicht angenommen` : `${v.umfang.map((u) => UMFANG[u]).join(", ")}${v.bis ? ` · bis ${datum(v.bis)}` : " · unbefristet"}`}
                    </span>
                  </span>
                  <button type="button" onClick={() => confirm("Vollmacht widerrufen?") && aktion({ aktion: "widerrufen", id: v.id }, "Widerrufen.")} className="text-[14px] text-danger">
                    Widerrufen<span className="sr-only"> ({v.anName})</span>
                  </button>
                </Glass>
              </li>
            ))}
          </ul>
        )}
        {formular === "vollmacht" ? (
          <VollmachtFormular onSenden={(b) => aktion({ aktion: "erteilen", ...b }, "Einladung verschickt. Die Vollmacht gilt, sobald sie angenommen ist.", () => setFormular(""))} onAbbrechen={() => setFormular("")} />
        ) : (
          <Button variant="glass" className="mt-4" onClick={() => setFormular("vollmacht")}>
            <Icon name="plus" className="size-4" />
            Vollmacht erteilen
          </Button>
        )}
      </section>

      <section aria-labelledby="h-firma">
        <h2 id="h-firma" className="text-[20px] font-semibold tracking-tight">
          Unternehmen und Vereine
        </h2>
        <p className="mt-1 text-[14px] text-muted">Gewerbe, Sondernutzungen, Rechnungen und Bescheide an einem Ort – mit mehreren Personen.</p>
        {d.organisationen
          .filter((o) => o.rolle === "inhaber")
          .map((o) => (
            <Glass key={o.id} className="mt-4 rounded-[24px] p-6">
              <h3 className="text-[17px] font-semibold">{o.vonName}</h3>
              <ul className="mt-3 divide-y divide-[var(--line)] text-[14px]">
                {o.mitglieder?.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {m.anName ?? m.anEmail} <span className="text-subtle">· {m.rolle === "inhaber" ? "Inhaber/in" : "Mitarbeiter/in"}{m.status === "offen" ? " · eingeladen" : ""}</span>
                    </span>
                    <button type="button" onClick={() => confirm("Zugang entfernen?") && aktion({ aktion: "widerrufen", id: m.id }, "Entfernt.")} className="text-[13px] text-danger">
                      Entfernen<span className="sr-only"> ({m.anName ?? m.anEmail})</span>
                    </button>
                  </li>
                ))}
              </ul>
              {einladen === o.orgId ? (
                <EinladenFormular onSenden={(b) => aktion({ aktion: "einladen", orgId: o.orgId, ...b }, "Einladung verschickt.", () => setEinladen(null))} onAbbrechen={() => setEinladen(null)} />
              ) : (
                <button type="button" onClick={() => setEinladen(o.orgId)} className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-accent">
                  <Icon name="plus" className="size-4" />
                  Person einladen
                </button>
              )}
            </Glass>
          ))}
        {formular === "firma" ? (
          <FirmaFormular onSenden={(b) => aktion({ aktion: "organisation", ...b }, "Unternehmenskonto angelegt.", () => setFormular(""))} onAbbrechen={() => setFormular("")} />
        ) : (
          <Button variant="glass" className="mt-4" onClick={() => setFormular("firma")}>
            <Icon name="plus" className="size-4" />
            Unternehmen oder Verein anlegen
          </Button>
        )}
      </section>

      {d.protokoll.length > 0 && (
        <section aria-labelledby="h-protokoll">
          <h2 id="h-protokoll" className="text-[20px] font-semibold tracking-tight">
            Was andere in meinem Namen getan haben
          </h2>
          <ul className="mt-4 space-y-1 text-[14px]">
            {d.protokoll.map((l, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] py-2">
                <span>
                  {l.aktion}
                  {l.details ? <span className="text-muted"> · {l.details}</span> : null}
                </span>
                <span className="text-subtle">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(l.am))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p role={meldung?.ok === false ? "alert" : "status"} className={`text-[14px] ${meldung?.ok === false ? "text-danger" : "text-success"}`}>
        {meldung?.text}
      </p>
    </div>
  );
}

function VollmachtFormular({ onSenden, onAbbrechen }: { onSenden: (b: object) => void; onAbbrechen: () => void }) {
  const [umfang, setUmfang] = useState<Umfang[]>(["antraege", "termine", "post"]);
  return (
    <Glass className="mt-4 rounded-[24px] p-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSenden({ name: f.get("name"), email: f.get("email"), umfang, bis: f.get("bis") || undefined });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[14px] font-medium">
            Name der Person
            <input name="name" required minLength={2} className="field-input mt-1" />
          </label>
          <label className="block text-[14px] font-medium">
            E-Mail-Adresse der Person
            <input name="email" type="email" required className="field-input mt-1" />
          </label>
        </div>
        <fieldset>
          <legend className="text-[14px] font-medium">Was darf die Person für Sie tun?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(Object.keys(UMFANG) as Umfang[]).map((u) => (
              <label key={u} className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="checkbox" checked={umfang.includes(u)} onChange={() => setUmfang((x) => (x.includes(u) ? x.filter((y) => y !== u) : [...x, u]))} />
                {UMFANG[u]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-[14px] font-medium sm:w-1/2">
          Gültig bis (freiwillig)
          <input name="bis" type="date" className="field-input mt-1" />
        </label>
        <p className="text-[13px] text-subtle">Nicht übertragbar: Wohnsitzanmeldung mit Online-Ausweis, Abstimmungen, Ihr Profil und Ihre Sicherheitseinstellungen.</p>
        <div className="flex gap-2">
          <Button type="submit" disabled={!umfang.length}>
            Einladung senden
          </Button>
          <Button type="button" variant="quiet" onClick={onAbbrechen}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Glass>
  );
}

function EinladenFormular({ onSenden, onAbbrechen }: { onSenden: (b: object) => void; onAbbrechen: () => void }) {
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_10rem]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSenden({ name: f.get("name"), email: f.get("email"), rolle: f.get("rolle") });
      }}
    >
      <input name="name" required minLength={2} aria-label="Name" placeholder="Name" className="field-input" />
      <input name="email" type="email" required aria-label="E-Mail-Adresse" placeholder="E-Mail-Adresse" className="field-input" />
      <select name="rolle" aria-label="Rolle" className="field-input">
        <option value="mitarbeiter">Mitarbeiter/in</option>
        <option value="inhaber">Inhaber/in</option>
      </select>
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" className="!min-h-10 px-4 text-[14px]">
          Einladen
        </Button>
        <Button type="button" variant="quiet" className="!min-h-10 px-4 text-[14px]" onClick={onAbbrechen}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

function FirmaFormular({ onSenden, onAbbrechen }: { onSenden: (b: object) => void; onAbbrechen: () => void }) {
  return (
    <Glass className="mt-4 rounded-[24px] p-6">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = (k: string) => String(f.get(k) ?? "").trim() || undefined;
          onSenden({ name: s("name"), rechtsform: s("rechtsform"), strasse: s("strasse"), plz: s("plz"), ort: s("ort"), email: s("email"), telefon: s("telefon") });
        }}
      >
        <label className="block text-[14px] font-medium sm:col-span-2">
          Name des Unternehmens oder Vereins
          <input name="name" required minLength={2} autoComplete="organization" className="field-input mt-1" />
        </label>
        <label className="block text-[14px] font-medium">
          Rechtsform
          <input name="rechtsform" list="rechtsformen" className="field-input mt-1" />
          <datalist id="rechtsformen">
            {["Einzelunternehmen", "GbR", "GmbH", "UG (haftungsbeschränkt)", "e. K.", "e. V.", "KG", "OHG", "AG"].map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <label className="block text-[14px] font-medium">
          E-Mail für Post der Verwaltung
          <input name="email" type="email" required className="field-input mt-1" />
        </label>
        <label className="block text-[14px] font-medium sm:col-span-2">
          Straße und Hausnummer
          <input name="strasse" autoComplete="street-address" className="field-input mt-1" />
        </label>
        <label className="block text-[14px] font-medium">
          Postleitzahl
          <input name="plz" inputMode="numeric" maxLength={5} pattern="\d{5}" autoComplete="postal-code" className="field-input mt-1" />
        </label>
        <label className="block text-[14px] font-medium">
          Ort
          <input name="ort" autoComplete="address-level2" className="field-input mt-1" />
        </label>
        <label className="block text-[14px] font-medium">
          Telefon (freiwillig)
          <input name="telefon" type="tel" className="field-input mt-1" />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Anlegen</Button>
          <Button type="button" variant="quiet" onClick={onAbbrechen}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Glass>
  );
}
