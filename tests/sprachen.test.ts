import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { normalisiere } from "@/lib/assistant/text";
import { fuerBrowser } from "@/lib/config-browser";
import { deutsch, dict, rtl, tx } from "@/lib/i18n";
import { anwenden, type AnpassungRecord } from "@/lib/admin/anpassungen";

describe("Sprachen", () => {
  const t = { de: "Hund anmelden", en: "Register a dog", tr: "Köpek kaydı" };
  it("Fallback: Leichte Sprache → Deutsch, andere → Englisch → Deutsch", () => {
    expect(tx(t, "tr")).toBe("Köpek kaydı");
    expect(tx(t, "ru")).toBe("Register a dog");
    expect(tx(t, "ls")).toBe("Hund anmelden");
    expect(tx({ de: "Nur Deutsch" }, "ar")).toBe("Nur Deutsch");
  });
  it("Leichte Sprache gilt als deutsche Oberfläche, Arabisch läuft von rechts", () => {
    expect(deutsch("ls")).toBe(true);
    expect(deutsch("tr")).toBe(false);
    expect(rtl("ar")).toBe(true);
    expect(dict("uk").weiter).toBe("Далі");
  });
  it("alle Wörterbücher sind vollständig", () => {
    const schluessel = Object.keys(dict("de")).sort();
    for (const l of ["ls", "en", "tr", "uk", "ar", "ru"] as const) expect(Object.keys(dict(l)).sort()).toEqual(schluessel);
  });
  it("die Browser-Config enthält nur die gewählte Sprache und keine Formulare", () => {
    const b = fuerBrowser(musterstadt, "tr");
    const hund = b.leistungen.find((l) => l.id === "hund-anmelden")!;
    expect(hund.titel).toBe("Köpek kaydı");
    expect(hund.formular?.schritte).toEqual([]);
    expect(JSON.stringify(b).length).toBeLessThan(JSON.stringify(musterstadt).length / 2);
    expect(JSON.stringify(b)).not.toContain("Українська");
  });
  it("Admin-Änderungen am Untertitel lassen Übersetzungen stehen", () => {
    const neu = anwenden(musterstadt, { id: "x", tenant: "musterstadt", leistungen: {}, texte: { untertitel: "Rathaus online" }, erstelltAm: "", loeschenAm: "" } as AnpassungRecord);
    expect(tx(neu.texte.untertitel, "de")).toBe("Rathaus online");
    expect(tx(neu.texte.untertitel, "tr")).toBe("Online vatandaş hizmetleri");
  });
  it("der Assistent behält Buchstaben aller Schriften", () => {
    expect(normalisiere("Зареєструвати собаку!")).toBe("зареєструвати собаку");
    expect(normalisiere("Köpek kaydı?")).toBe("koepek kaydı");
  });
});
