import { describe, expect, it } from "vitest";
import { ibanGueltig, validiereFeld } from "@/lib/flows/validate";

describe("Formular-Validierung", () => {
  it("prüft IBAN-Prüfsummen", () => {
    expect(ibanGueltig("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(ibanGueltig("DE89 3704 0044 0532 0130 01")).toBe(false);
  });
  it("liefert verständliche Fehlermeldungen", () => {
    expect(validiereFeld({ id: "plz", typ: "plz", label: "PLZ", pflicht: true }, "123")).toMatch(/5 Ziffern/);
    expect(validiereFeld({ id: "e", typ: "email", label: "E-Mail", pflicht: true }, "")).toMatch(/füllen Sie/);
  });
});
