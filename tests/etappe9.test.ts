import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { pruefeGemeinde } from "@/config/schema";
import { altersgruppe, alleWuensche, antworte, bieteAn, meldeBedarf, rang } from "@/lib/kita/service";
import { anmeldungen, belegt, melde, storniere, type Veranstaltung } from "@/lib/veranstaltungen/service";
import { ergebnis, legeHaushaltAn, waehle } from "@/lib/beteiligung/haushalt";
import { erfasse, finde } from "@/lib/parken/service";
import { ausNina, kreisArs } from "@/lib/warnungen/service";
import { kachelErlaubt, zuGrad, zuPixel } from "@/lib/karte";
import { istLive } from "@/lib/ratsinfo/service";
import type { KontoRecord } from "@/lib/records";

const konto = (id: string, niveau: "basis" | "hoch" = "basis") => ({ id, tenant: musterstadt.slug, vertrauensniveau: niveau }) as unknown as KontoRecord;
const naechstesJahr = `${new Date().getFullYear() + 1}`;

describe("Konfiguration", () => {
  it("Musterstadt mit Kitas, Vereinen, Veranstaltungen, Friedhöfen und Orten ist gültig", () => {
    expect(pruefeGemeinde(musterstadt)).toEqual([]);
    expect(pruefeGemeinde({ ...musterstadt, veranstaltungen: [{ ...musterstadt.veranstaltungen![0], vereinId: "gibtsnicht" }] }).join()).toContain("unbekannter Verein");
  });
});

describe("Kita-Platz-Börse", () => {
  it("bestimmt die Altersgruppe zum Beginn", () => {
    expect(altersgruppe("2025-03-15", "2026-08")).toBe("u3");
    expect(altersgruppe("2023-08-01", "2026-08")).toBe("ue3");
    expect(altersgruppe("2023-08-02", "2026-08")).toBe("u3");
    expect(altersgruppe("2019-01-01", "2026-08")).toBe("hort");
  });

  it("Warteliste nach Eingang, Angebot annehmen zieht andere Wünsche zurück", async () => {
    const kind = (v: string) => ({ vorname: v, geburtsdatum: `${Number(naechstesJahr) - 2}-01-10`, stunden: 35 });
    const a = await meldeBedarf(musterstadt, "konto-a", kind("Ada"), `${naechstesJahr}-08`, ["sonnenschein", "krabbelstube"]);
    const b = await meldeBedarf(musterstadt, "konto-b", kind("Ben"), `${naechstesJahr}-08`, ["sonnenschein", "regenbogen"]);
    // Regenbogen nimmt nur Kinder ab 3 – wird verworfen
    expect(b.kitas).toEqual(["sonnenschein"]);
    const alle = await alleWuensche(musterstadt);
    expect(rang(alle, a, "sonnenschein")).toBe(1);
    expect(rang(alle, b, "sonnenschein")).toBe(2);

    const angebot = await bieteAn(musterstadt, a, musterstadt.kitas![0], "Kita");
    expect(angebot.status.sonnenschein).toBe("angebot");
    await expect(bieteAn(musterstadt, angebot, musterstadt.kitas![2], "Kita")).rejects.toThrow();
    const zu = await antworte(angebot, true);
    expect(zu.status).toEqual({ sonnenschein: "zugesagt", krabbelstube: "zurueckgezogen" });
    // Ben rückt auf Platz 1
    expect(rang(await alleWuensche(musterstadt), b, "sonnenschein")).toBe(1);
  });
});

describe("Veranstaltungen", () => {
  const v: Veranstaltung = { id: "test-kurs", titel: "Kurs", text: "", beginn: `${naechstesJahr}-03-01T10:00`, ort: "Saal", kategorie: "Kurs", anmeldung: true, plaetze: 3, quelle: "config" };
  it("füllt Plätze, setzt auf die Warteliste und lässt nachrücken – auch bei gleichzeitigen Anmeldungen", async () => {
    const d = (n: string) => ({ name: n, email: `${n}@example.org` });
    const r = await Promise.all([melde(musterstadt, v, d("a"), 2, "http://x"), melde(musterstadt, v, d("b"), 1, "http://x"), melde(musterstadt, v, d("c"), 1, "http://x")]);
    expect(r.map((x) => x.status)).toEqual(["angemeldet", "angemeldet", "warteliste"]);
    expect(belegt(await anmeldungen(musterstadt, v.id))).toBe(3);
    const erste = (await anmeldungen(musterstadt, v.id)).find((a) => a.id === r[1].id)!;
    // storniere sucht die Veranstaltung über die Config – hier direkt mit Testdaten
    const tenant = { ...musterstadt, veranstaltungen: [v] };
    expect(await storniere(tenant, erste)).toBe(1);
    const danach = await anmeldungen(musterstadt, v.id);
    expect(danach.find((a) => a.id === r[2].id)!.status).toBe("angemeldet");
    expect(belegt(danach)).toBe(3);
  });
});

describe("Bürgerhaushalt", () => {
  it("lehnt Auswahl über Budget ab, zählt eine Teilnahme je Konto, finanziert nach Stimmen", async () => {
    const bis = new Date(Date.now() + 86400_000).toISOString();
    const h = await legeHaushaltAn(musterstadt, { titel: "Test", text: "", budgetEuro: 100, bis, nurOnlineAusweis: false, autor: "t", projekte: [{ titel: "A", text: "", kostenEuro: 60 }, { titel: "B", text: "", kostenEuro: 50 }, { titel: "C", text: "", kostenEuro: 30 }] });
    expect(await waehle(musterstadt, h.id, konto("x"), ["p1", "p2"])).toBe("budget");
    expect(await waehle(musterstadt, h.id, konto("x"), ["p1", "p3"])).toBe("ok");
    expect(await waehle(musterstadt, h.id, konto("x"), ["p2"])).toBe("schon");
    expect(await waehle(musterstadt, h.id, konto("y"), ["p2", "p3"])).toBe("ok");
    const e = ergebnis({ ...h, stimmen: { p1: 1, p2: 1, p3: 2 } });
    expect(e.map((p) => [p.titel, p.finanziert])).toEqual([
      ["C", true],
      ["B", true],
      ["A", false],
    ]);
  });
});

describe("Verwarnungsgeld", () => {
  it("findet den Fall nur mit Aktenzeichen und Kennzeichen – Schreibweise egal", async () => {
    await erfasse(musterstadt, { aktenzeichen: "VG-TEST-1", kennzeichen: "MS-XY 42", betragCent: 2000, tatbestand: "Test", tatzeit: "2026-10-01T10:00", tatort: "Markt" }, "t");
    expect(await finde(musterstadt, "vg-test-1", "ms xy42")).toBeTruthy();
    expect(await finde(musterstadt, "VG-TEST-1", "MS-XY 43")).toBeUndefined();
  });
});

describe("Warnungen, Karte, Livestream", () => {
  it("übernimmt nur ernste NINA-Warnungen und nutzt den Kreisschlüssel", () => {
    expect(kreisArs("064330004004")).toBe("064330000000");
    const w = ausNina([
      { id: "1", payload: { data: { headline: "Unwetter", severity: "Severe" } } },
      { id: "2", payload: { data: { headline: "Info", severity: "Minor" } } },
      { id: "3", payload: { data: { headline: "Aufgehoben", severity: "Severe", msgType: "Cancel" } } },
    ]);
    expect(w.map((x) => [x.titel, x.stufe])).toEqual([["Unwetter", "gefahr"]]);
  });
  it("Web-Mercator hin und zurück; Kacheln nur rund um die Gemeinde", () => {
    const p = zuPixel(50.65, 9.74, 15);
    const g = zuGrad(p.x, p.y, 15);
    expect(g.lat).toBeCloseTo(50.65, 6);
    expect(g.lng).toBeCloseTo(9.74, 6);
    const k = { x: Math.floor(p.x / 256), y: Math.floor(p.y / 256) };
    expect(kachelErlaubt([50.65, 9.74], 15, k.x, k.y)).toBe(true);
    expect(kachelErlaubt([50.65, 9.74], 15, k.x + 200, k.y)).toBe(false);
    expect(kachelErlaubt([50.65, 9.74], 5, 0, 0)).toBe(false);
  });
  it("Livestream gilt ab 15 Minuten vor bis 5 Stunden nach Beginn", () => {
    const t = Date.parse("2026-11-12T17:00:00Z");
    expect(istLive({ datum: "2026-11-12T18:00:00+01:00", livestream: "https://x" }, t - 10 * 60_000)).toBe(true);
    expect(istLive({ datum: "2026-11-12T18:00:00+01:00", livestream: "https://x" }, t + 6 * 3600_000)).toBe(false);
    expect(istLive({ datum: "2026-11-12T18:00:00+01:00" }, t)).toBe(false);
  });
});
