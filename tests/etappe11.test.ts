import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { pruefeGemeinde } from "@/config/schema";
import { barrierefreiDunkel, barrierefreiHell, contrast } from "@/lib/color";
import { aktiv, jahrespreis, PAKETE } from "@/lib/funktionen";
import { findeGemeinde, kreisLeistung, portalAdresse, punkteFuer } from "@/lib/landkreis";
import { baueGemeinde, erzeugeWappen, slugAus, svgSicher } from "@/lib/mandanten/service";
import { textPdf } from "@/lib/pdf/text";
import { darfAmt, pruefeSchluessel } from "@/lib/schnittstelle";
import musterkreis from "@/tenants/musterkreis/gemeinde.config";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";

describe("Pakete", () => {
  it("schalten Funktionen nach Paket frei – ausdrückliche Schalter gehen vor", () => {
    expect(aktiv({ paket: "basis" }, "kiEntwurf")).toBe(false);
    expect(aktiv({ paket: "premium" }, "kiEntwurf")).toBe(true);
    expect(aktiv({ paket: "komfort" }, "wirkungsbericht")).toBe(true);
    expect(aktiv({ paket: "basis", funktionen: { kiEntwurf: true } }, "kiEntwurf")).toBe(true);
    expect(aktiv({ paket: "premium", funktionen: { kiEntwurf: false } }, "kiEntwurf")).toBe(false);
    // ohne Paket: Standard
    expect(aktiv({}, "abfall")).toBe(true);
  });

  it("jedes höhere Paket enthält das kleinere", () => {
    for (const f of PAKETE.basis.funktionen) expect(PAKETE.komfort.funktionen).toContain(f);
    for (const f of PAKETE.komfort.funktionen) expect(PAKETE.premium.funktionen).toContain(f);
  });

  it("berechnet den Jahrespreis aus Grundpreis und Einwohnern", () => {
    expect(jahrespreis("basis")).toBe(PAKETE.basis.grundpreisEuro);
    expect(jahrespreis("komfort", 10_000)).toBe(PAKETE.komfort.grundpreisEuro + 3500);
  });
});

describe("Neue Gemeinde per Klick", () => {
  const d = { name: "Waldbrunn", art: "Gemeinde", farbe: "#ffcc00", einwohner: 4800, paket: "komfort" as const, email: "info@waldbrunn.example", strasse: "Rathausplatz 1", plz: "12399" };

  it("Demo-Gemeinde ist eine gültige Konfiguration mit Beispieldaten", () => {
    const g = baueGemeinde({ ...d, demo: true }, "waldbrunn");
    expect(pruefeGemeinde(g)).toEqual([]);
    expect(g.slug).toBe("waldbrunn");
    expect(JSON.stringify(g)).not.toContain("Musterstadt");
    expect(g.kitas?.length).toBeGreaterThan(0);
  });

  it("echte Gemeinde startet ohne Beispieldaten und mit lesbarer Akzentfarbe", () => {
    const g = baueGemeinde({ ...d, demo: false }, "waldbrunn");
    expect(pruefeGemeinde(g)).toEqual([]);
    expect(g.kitas).toBeUndefined();
    expect(g.leistungen.length).toBe(musterstadt.leistungen.length);
    expect(contrast(g.akzentfarbe, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("Kontrast-Helfer erreichen WCAG AA auf Hell und Dunkel", () => {
    for (const f of ["#ffcc00", "#00a0e0", "#123456", "#7fff00"]) {
      expect(contrast(barrierefreiHell(f), "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(barrierefreiDunkel(f), "#07090b")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(barrierefreiDunkel(f), "#12161a")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("Slug, Wappen und SVG-Prüfung", () => {
    expect(slugAus("Bad Münster-Ölbach")).toBe("bad-muenster-oelbach");
    const w = erzeugeWappen("Stadt <Ärger>", "#336699");
    expect(svgSicher(w)).toBe(true);
    expect(w).toContain(">&lt;<");
    expect(svgSicher('<svg><script>alert(1)</script></svg>')).toBe(false);
    expect(svgSicher('<svg onload="x()"></svg>')).toBe(false);
    expect(svgSicher('<svg><image href="https://evil.example/x.png"/></svg>')).toBe(false);
    expect(svgSicher('<svg><use href="#a"/></svg>')).toBe(true);
    expect(svgSicher('<svg><use xlink:href="data:x"/></svg>')).toBe(false);
  });
});

describe("Landkreis", () => {
  it("findet Kreisleistungen und Gemeinden", () => {
    const kfz = kreisLeistung(musterkreis, "Ich möchte mein Auto anmelden");
    expect(kfz?.l.id).toBe("kfz-zulassung");
    expect(kreisLeistung(musterkreis, "Wann ist Sperrmüll?")).toBeUndefined();
    // „Auto anmelden“ passt zur Kreisleistung besser als zur Wohnsitz-Anmeldung der Gemeinde
    const wohnsitz = musterstadt.leistungen.find((l) => l.id === "wohnsitz-anmelden")!;
    expect(kfz!.punkte).toBeGreaterThan(punkteFuer(wohnsitz, "Ich möchte mein Auto anmelden"));
    expect(findeGemeinde(musterkreis, "123").map((g) => g.name)).toEqual(expect.arrayContaining(["Stadt Musterstadt", "Gemeinde Nordheim"]));
    expect(findeGemeinde(musterkreis, "beispiel").map((g) => g.slug)).toEqual(["beispielhausen"]);
    expect(findeGemeinde(musterkreis, "")).toEqual([]);
  });

  it("Portaladresse enthält die Gemeinde", () => {
    expect(portalAdresse("musterkreis", "/leistungen/kfz-zulassung")).toContain("kfz-zulassung");
    expect(portalAdresse("musterkreis")).toContain("musterkreis");
  });
});

describe("Fachverfahren", () => {
  const alt = process.env.SCHNITTSTELLEN;
  afterEach(() => {
    process.env.SCHNITTSTELLEN = alt;
  });

  it("PDF hat gültigen Kopf und Ende, auch bei Umlauten und vielen Zeilen", () => {
    const zeilen = Array.from({ length: 120 }, (_, i) => [`Feld ${i}`, "Größe – „Wert“ €"] as [string, string]);
    const pdf = textPdf("Antrag Ä", "Unterzeile", [{ ueberschrift: "Angaben", zeilen }], "Fuß");
    const s = pdf.toString("latin1");
    expect(s.startsWith("%PDF-")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect((s.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });

  it("Schlüssel wird nur über den Hash und nur für die eigene Gemeinde erkannt", () => {
    const schluessel = "ein-sehr-langer-test-schluessel-123";
    process.env.SCHNITTSTELLEN = JSON.stringify([{ name: "Steuer", gemeinde: "musterstadt", aemter: ["steueramt"], hash: createHash("sha256").update(schluessel).digest("hex") }]);
    const req = (t: string) => new Request("https://x.example", { headers: { authorization: `Bearer ${t}` } });
    const s = pruefeSchluessel(req(schluessel), musterstadt);
    expect(s?.name).toBe("Steuer");
    expect(darfAmt(s!, "steueramt")).toBe(true);
    expect(darfAmt(s!, "buergerbuero")).toBe(false);
    expect(pruefeSchluessel(req(schluessel + "x"), musterstadt)).toBeUndefined();
    expect(pruefeSchluessel(req(schluessel), musterkreis)).toBeUndefined();
    expect(pruefeSchluessel(new Request("https://x.example"), musterstadt)).toBeUndefined();
  });
});
