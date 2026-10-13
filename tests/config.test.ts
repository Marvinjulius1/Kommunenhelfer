import { describe, expect, it } from "vitest";
import { pruefeGemeinde } from "@/config/schema";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import beispielhausen from "@/tenants/beispielhausen/gemeinde.config";

const kopie = () => structuredClone(musterstadt);

describe("Config-Validierung", () => {
  it("akzeptiert die Beispiel-Gemeinden", () => {
    expect(pruefeGemeinde(musterstadt)).toEqual([]);
    expect(pruefeGemeinde(beispielhausen)).toEqual([]);
  });

  it("meldet fehlende Pflichtfelder mit Pfad", () => {
    const c = kopie() as unknown as Record<string, unknown>;
    delete c.rechtliches;
    delete c.uploads;
    const f = pruefeGemeinde(c);
    expect(f.some((x) => x.startsWith("rechtliches"))).toBe(true);
    expect(f.some((x) => x.startsWith("uploads"))).toBe(true);
  });

  it("erkennt ungültige Verweise", () => {
    const c = kopie();
    c.leistungen[0].amtId = "gibt-es-nicht";
    c.uploads.standardAmtId = "auch-nicht";
    c.leistungen[0].dokumente = [{ art: "unbekannt", pflicht: true }];
    const f = pruefeGemeinde(c);
    expect(f.join("\n")).toMatch(/amtId: Amt "gibt-es-nicht"/);
    expect(f.join("\n")).toMatch(/uploads.standardAmtId/);
    expect(f.join("\n")).toMatch(/unbekannte Dokumentart "unbekannt"/);
  });

  it("prüft Kontraste der Akzentfarbe (WCAG AA)", () => {
    const c = kopie();
    c.akzentfarbe = "#9ec5ff";
    expect(pruefeGemeinde(c).join()).toMatch(/Kontrast/);
  });

  it("erlaubt Webhooks nur über https", () => {
    const c = kopie();
    c.aemter[0].weiterleitung = { typ: "webhook", url: "http://fachverfahren.example/eingang", secretEnv: "WEBHOOK_SECRET" };
    expect(pruefeGemeinde(c).join()).toMatch(/nur https/);
  });

  it("verlangt ein E-Mail-Feld in Formularen", () => {
    const c = kopie();
    const f = c.leistungen.find((l) => l.formular)!.formular!;
    f.schritte = f.schritte.map((s) => ({ ...s, felder: s.felder.filter((x) => x.id !== "email") }));
    expect(pruefeGemeinde(c).join()).toMatch(/Feld "email" fehlt/);
  });
});
