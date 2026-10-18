import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { berechneHinweise, geburtstag, naechstesDatum, type HinweisDaten } from "@/lib/konto/hinweise";
import { normalisiereTelefon } from "@/lib/kurznachricht";
import { fristlage, werktageBis, werktageZwischen } from "@/lib/vorgaenge/fristen";
import { kurztext } from "@/lib/vorgaenge/benachrichtigung";
import { kennzahlen, STANDARD_WIRKUNG, veraenderung, zeitraum } from "@/lib/wirkung";
import { pruefeGemeinde } from "@/config/schema";

const leer: HinweisDaten = { profil: { vorname: "Erika", nachname: "M", email: "e@x.de" }, vorgaenge: [], termine: [], zahlungen: [], checklisten: [] };

describe("Was steht bei mir an?", () => {
  it("Geburtstag am 29.02. fällt in Nicht-Schaltjahren auf den 01.03.", () => {
    expect(geburtstag("2020-02-29", 3)).toBe("2023-03-01");
    expect(geburtstag("2020-02-29", 4)).toBe("2024-02-29");
  });

  it("findet das nächste Vorkommen jährlicher und einmaliger Stichtage", () => {
    expect(naechstesDatum("07-01", "2026-06-20")).toBe("2026-07-01");
    expect(naechstesDatum("07-01", "2026-07-02")).toBe("2027-07-01");
    expect(naechstesDatum("2026-01-01", "2026-06-20")).toBeUndefined();
  });

  it("erinnert an die Hundesteuer nur mit Hund – und rechtzeitig", () => {
    const ohne = berechneHinweise(musterstadt, leer, "2026-06-20");
    expect(ohne.some((h) => h.id.startsWith("stichtag:hundesteuer"))).toBe(false);
    const mit = berechneHinweise(musterstadt, { ...leer, profil: { ...leer.profil, hund: true } }, "2026-06-20");
    const h = mit.find((x) => x.id === "stichtag:hundesteuer:2026-07-01");
    expect(h?.erinnern).toBe(true);
    // zu früh: Vorlauf 14 Tage
    expect(berechneHinweise(musterstadt, { ...leer, profil: { ...leer.profil, hund: true } }, "2026-05-01").some((x) => x.id.startsWith("stichtag:hundesteuer"))).toBe(false);
  });

  it("Kind wird 3 → Kita-Hinweis; nach einem Kita-Antrag nicht mehr", () => {
    const daten = { ...leer, profil: { ...leer.profil, kinder: [{ vorname: "Mia", geburtsdatum: "2023-09-01" }] } };
    const h = berechneHinweise(musterstadt, daten, "2026-06-20");
    expect(h.find((x) => x.id.startsWith("kita3:"))?.titel).toContain("Mia wird am 1. September drei Jahre alt");
    const mitAntrag = berechneHinweise(musterstadt, { ...daten, vorgaenge: [{ id: "V1", status: "eingegangen", leistungId: "kita-anmeldung", erstelltAm: "2026-05-01T10:00:00Z" }] }, "2026-06-20");
    expect(mitAntrag.some((x) => x.id.startsWith("kita3:"))).toBe(false);
  });

  it("Ausweispflicht ab 16 und ablaufender Reisepass", () => {
    const h = berechneHinweise(musterstadt, { ...leer, profil: { ...leer.profil, reisepassGueltigBis: "2026-07-10", kinder: [{ vorname: "Ben", geburtsdatum: "2010-08-01" }] } }, "2026-06-20");
    expect(h.find((x) => x.id.startsWith("ausweis16:"))?.href).toBe("/termine?leistung=personalausweis");
    const pass = h.find((x) => x.id === "reisepass:2026-07-10");
    expect(pass?.wichtig).toBe(true);
    expect(pass?.titel).toBe("Ihr Reisepass läuft in 20 Tagen ab");
  });

  it("Rückfragen stehen oben und lassen sich nicht ausblenden; Ausgeblendetes verschwindet", () => {
    const h = berechneHinweise(musterstadt, { ...leer, profil: { ...leer.profil, hund: true }, vorgaenge: [{ id: "V9", status: "rueckfrage", erstelltAm: "2026-06-01T00:00:00Z" }] }, "2026-06-20");
    expect(h[0].id).toBe("rueckfrage:V9");
    expect(h[0].ausblendbar).toBe(false);
    const aus = berechneHinweise(musterstadt, { ...leer, profil: { ...leer.profil, hund: true }, ausgeblendet: ["stichtag:hundesteuer:2026-07-01"] }, "2026-06-20");
    expect(aus.some((x) => x.id.startsWith("stichtag:hundesteuer"))).toBe(false);
  });
});

describe("Fristüberwachung", () => {
  const v = { erstelltAm: "2026-12-21T09:00:00Z", amtId: "buergerbuero", status: "eingegangen" };
  it("zählt Werktage ohne Wochenende und Feiertage", () => {
    // 21.12.2026 (Mo) + 10 Werktage – ohne Feiertage und die Schließtage 24.12./31.12.
    expect(werktageBis(musterstadt, v)).toBe("2027-01-08");
    expect(werktageZwischen(musterstadt, "2027-01-04", "2027-01-06")).toBe(2);
    expect(werktageZwischen(musterstadt, "2027-01-08", "2027-01-06")).toBe(-2);
  });
  it("erkennt überschrittene Fristen und fällige Wiedervorlagen", () => {
    expect(fristlage(musterstadt, v, "2027-01-08")).toMatchObject({ rest: 0, ueberfaellig: false, bald: true });
    const f = fristlage(musterstadt, { ...v, wiedervorlage: { am: "2027-01-08" } }, "2027-01-11")!;
    expect(f.rest).toBe(-1);
    expect(f.ueberfaellig).toBe(true);
    expect(f.wiedervorlageFaellig).toBe(true);
    expect(fristlage(musterstadt, { ...v, status: "erledigt" }, "2027-01-08")).toBeUndefined();
  });
});

describe("Status-Nachrichten", () => {
  it("normalisiert Mobilnummern nach E.164", () => {
    expect(normalisiereTelefon("0151 234 567 89")).toBe("+4915123456789");
    expect(normalisiereTelefon("0049 (151) 2345-6789")).toBe("+4915123456789");
    expect(normalisiereTelefon("+43 664 1234567")).toBe("+436641234567");
    expect(normalisiereTelefon("12")).toBeUndefined();
  });
  it("enthält nur Vorgangsnummer und Stand – keine Inhalte", () => {
    const t = kurztext(musterstadt, "MS-2026-ABC", "rueckfrage");
    expect(t).toContain("MS-2026-ABC");
    expect(t.length).toBeLessThan(200);
  });
});

describe("Wirkungsbericht", () => {
  it("rechnet Zeit, Gegenwert, Quoten und Zufriedenheit aus Tageszählern", () => {
    const k = kennzahlen(
      [
        { zaehler: { vorgaenge: 50, termine: 30, wartemarken: 20, assistent_beantwortet: 100, bescheide_digital: 40, erledigt: 10, erledigt_stunden: 480, frist_eingehalten: 9, bewertungen: 4, bewertung_summe: 18 }, leistungen: { "hund-anmelden": 5 } },
        { zaehler: { vorgaenge: 10 }, leistungen: { "hund-anmelden": 2 } },
      ],
      STANDARD_WIRKUNG,
    );
    expect(k.antraege).toBe(60);
    expect(k.onlineQuote).toBeCloseTo(60 / 110);
    expect(k.gesparteStunden).toBeCloseTo((60 * 12 + 30 * 4 + 100 * 3) / 60);
    expect(k.portoEuro).toBeCloseTo(38);
    expect(k.dauerTage).toBe(2);
    expect(k.fristQuote).toBeCloseTo(0.9);
    expect(k.zufriedenheit).toBe(4.5);
    expect(k.leistungen["hund-anmelden"]).toBe(7);
  });
  it("Zeiträume und Vergleich", () => {
    expect(zeitraum("vormonat", "2026-03-15")).toMatchObject({ von: "2026-02-01", bis: "2026-02-28", vorVon: "2026-01-04", vorBis: "2026-01-31" });
    expect(veraenderung(120, 100)).toBe(20);
    expect(veraenderung(5, 0)).toBeNull();
  });
});

describe("Konfiguration", () => {
  it("Musterstadt mit Stichtagen ist gültig; falsches Datumsformat wird gemeldet", () => {
    expect(pruefeGemeinde(musterstadt)).toEqual([]);
    const f = pruefeGemeinde({ ...musterstadt, stichtage: [{ id: "x", titel: "X", daten: ["1.7."], fuer: "alle", vorlaufTage: 3 }] });
    expect(f.join()).toContain("stichtage");
  });
});
