import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { pruefeGemeinde } from "@/config/schema";
import { anwenden, type AnpassungRecord } from "@/lib/admin/anpassungen";
import { erlaubteBetraege, fremdeBetraege, vorlage } from "@/lib/backoffice/entwurf";
import { baueLeistung, slug, zuBau, type BauLeistung } from "@/lib/formulare/baukasten";
import { kapazitaet, prognose, wochentagsMittel, type TagWert } from "@/lib/auslastung/prognose";
import { encryptJson } from "@/lib/crypto";
import type { VorgangRecord } from "@/lib/records";

const bau: BauLeistung = {
  aktiv: true,
  titel: "Osterfeuer anmelden",
  kurz: "Melden Sie Ihr Osterfeuer rechtzeitig an.",
  amtId: "ordnungsamt",
  stichworte: ["feuer", " Brauchtum "],
  unterlagen: ["Lageplan", ""],
  ablauf: [],
  gebuehr: 15,
  onlineBezahlen: true,
  kontakt: "voll",
  aufbewahrungTage: 180,
  schritte: [
    {
      titel: "Das Feuer",
      felder: [
        { label: "Datum", typ: "date", pflicht: true },
        { label: "Ort", typ: "text", pflicht: true },
        { label: "Größe", typ: "radio", pflicht: true, optionen: ["Klein (bis 2 m)", "Groß"] },
      ],
    },
  ],
};

describe("Formular-Baukasten", () => {
  it("baut eine gültige Leistung mit Kontaktschritt, eindeutigen IDs und Bezahlung", () => {
    const l = baueLeistung(bau, new Set(musterstadt.leistungen.map((x) => x.id)), "Musterstadt");
    expect(l.id).toBe("osterfeuer-anmelden");
    expect(l.formular!.schritte[0].felder.some((f) => f.id === "email")).toBe(true);
    const ids = l.formular!.schritte.flatMap((s) => s.felder.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
    // „Ort“ kollidiert mit dem Anschriftfeld „ort“
    expect(ids).toContain("ortAngabe");
    expect(l.bezahlung).toEqual({ betrag: 15 });
    expect(l.unterlagen).toEqual(["Lageplan"]);
    expect(l.stichworte).toContain("brauchtum");
    const a: AnpassungRecord = { id: "m", tenant: "musterstadt", leistungen: {}, eigeneLeistungen: [l], erstelltAm: "", loeschenAm: "" };
    const t = anwenden(musterstadt, a);
    expect(pruefeGemeinde(t)).toEqual([]);
    expect(t.leistungen.at(-1)!.id).toBe("osterfeuer-anmelden");
  });

  it("vergibt bei gleichem Titel eine neue ID und überschreibt keine Leistung der Konfiguration", () => {
    expect(baueLeistung({ ...bau, titel: "Hund anmelden" }, new Set(["hund-anmelden"])).id).toBe("hund-anmelden-2");
    const fremd = baueLeistung({ ...bau, id: "hund-anmelden" }, new Set());
    const t = anwenden(musterstadt, { id: "m", tenant: "musterstadt", leistungen: {}, eigeneLeistungen: [fremd], erstelltAm: "", loeschenAm: "" });
    expect(t.leistungen.filter((l) => l.id === "hund-anmelden")).toHaveLength(1);
  });

  it("macht aus einer bestehenden Leistung eine Vorlage – und zurück", () => {
    const hund = musterstadt.leistungen.find((l) => l.id === "hund-anmelden")!;
    const b = zuBau(hund);
    expect(b.schritte.length).toBeGreaterThan(0);
    expect(b.schritte.every((s) => s.felder.length > 0)).toBe(true);
    expect(slug("Größe & Straße")).toBe("groesse-strasse");
  });
});

describe("Entwürfe für Sachbearbeiter", () => {
  const v = {
    id: "MUS-2026-TEST1",
    tenant: "musterstadt",
    leistungId: "hund-anmelden",
    amtId: "steueramt",
    erstelltAm: "2026-10-01T10:00:00Z",
    dokumente: [],
    status: "eingegangen",
  } as unknown as VorgangRecord;
  const daten = { kontakt: { name: "Erika Muster", email: "e@x.de" } };

  it("Rückfrage nennt fehlende Pflichtunterlagen aus der Konfiguration", () => {
    const e = vorlage(musterstadt, v, daten, [], "rueckfrage");
    expect(e.quelle).toBe("vorlage");
    expect(e.text).toContain("Guten Tag Erika Muster");
    expect(e.text).toMatch(/Versicherung/i);
    expect(e.hinweise[0]).toMatch(/fehlen Pflichtunterlagen/);
  });

  it("Bescheid-Entwurf trifft keine Entscheidung, nennt nur Gebühren aus der Satzung", () => {
    const e = vorlage(musterstadt, v, daten, [], "bescheid");
    expect(e.text).toContain("[Entscheidung");
    expect(fremdeBetraege(e.text, erlaubteBetraege(musterstadt.leistungen.find((l) => l.id === "hund-anmelden")))).toEqual([]);
  });

  it("erkennt erfundene Beträge", () => {
    expect(fremdeBetraege("Die Gebühr beträgt 999,00 € und 10 Euro.", [10])).toEqual(["999,00"]);
  });

  it("Antwort bezieht sich auf die letzte Nachricht", () => {
    const e = vorlage(musterstadt, { ...v, nachrichten: encryptJson([]) }, daten, [{ von: "buerger", text: "Hallo", am: "2026-10-05T09:00:00Z" }], "antwort");
    expect(e.text).toContain("vom 5. Oktober 2026");
  });
});

describe("Auslastungsprognose", () => {
  const amt = musterstadt.aemter.find((a) => a.termine && a.id === "buergerbuero")!;
  it("berechnet Kapazität aus den Terminfenstern und schließt Feiertage aus", () => {
    const tag = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].find((d) => kapazitaet(musterstadt, amt, d).minuten > 0)!;
    expect(kapazitaet(musterstadt, amt, tag).plaetze).toBeGreaterThan(0);
    expect(kapazitaet(musterstadt, amt, "2026-12-25").minuten).toBe(0);
  });

  it("gewichtet jüngere Wochen stärker und meldet fehlendes Personal", () => {
    const h: TagWert[] = [
      { datum: "2026-10-12", termine: 100, wartenummern: 40 },
      { datum: "2026-10-05", termine: 10, wartenummern: 0 },
    ];
    const m = wochentagsMittel(h, "2026-10-19", "termine")!;
    expect(m).toBeGreaterThan(55);
    const p = prognose(musterstadt, amt, h, new Map([["2026-10-19", 3]]), "2026-10-18", 7);
    const mo = p.find((t) => t.datum === "2026-10-19")!;
    if (!mo.geschlossen) {
      expect(mo.erwartet).toBeGreaterThan(mo.gebucht);
      expect(mo.fehlen).toBe(Math.max(0, mo.noetig - mo.vorhanden));
    }
  });
});
