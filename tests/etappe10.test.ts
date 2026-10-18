import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { entferneKontoDaten, erstelleKonto, ladeKonto } from "@/lib/konto/service";
import { erhalten, erstelleOrganisation, erteile, erteilt, gueltig, inhaltVon, istInhaber, nimmAn, widerrufe } from "@/lib/konto/vertretung";

const person = (vorname: string) => erstelleKonto(musterstadt, { profil: { vorname, nachname: "Test", email: `${vorname}@example.org` }, vertrauensniveau: "basis", emailBestaetigt: true });

describe("Vollmacht", () => {
  it("wird per Einladung angenommen, gilt nur im Umfang und lässt sich widerrufen", async () => {
    const oma = await person("Erna");
    const tochter = await person("Petra");
    const { vollmacht, code } = await erteile(musterstadt, oma, { art: "vollmacht", anName: "Petra", anEmail: "petra@example.org", umfang: ["antraege", "post"] });
    expect(vollmacht.status).toBe("offen");
    // falscher Code, eigene Einladung
    expect(await nimmAn(musterstadt, `${vollmacht.id}.falsch`, tochter)).toBe("ungueltig");
    expect(await nimmAn(musterstadt, `${vollmacht.id}.${code}`, oma)).toBe("eigene");
    const v = await nimmAn(musterstadt, `${vollmacht.id}.${code}`, tochter);
    if (typeof v === "string") throw new Error(v);
    expect(gueltig(v)).toBe(true);
    expect(inhaltVon(v)).toMatchObject({ vonName: "Erna Test", anName: "Petra Test" });
    // Link nur einmal verwendbar
    expect(await nimmAn(musterstadt, `${vollmacht.id}.${code}`, await person("Dritte"))).toBe("ungueltig");
    expect((await erhalten(musterstadt, tochter.id)).map((x) => x.id)).toEqual([v.id]);
    await widerrufe(v);
    expect(await erhalten(musterstadt, tochter.id)).toEqual([]);
  });

  it("abgelaufene Vollmachten gelten nicht mehr", async () => {
    const a = await person("A");
    const { vollmacht } = await erteile(musterstadt, a, { art: "vollmacht", anName: "B", anEmail: "b@example.org", umfang: ["antraege"], bis: "2020-01-01" });
    expect(gueltig({ ...vollmacht, status: "aktiv" })).toBe(false);
  });
});

describe("Unternehmenskonto", () => {
  it("legt eine Organisation mit Inhaber an, Mitglieder per Einladung", async () => {
    const chefin = await person("Chefin");
    const { org } = await erstelleOrganisation(musterstadt, chefin, { name: "Bäckerei Korn GmbH", rechtsform: "GmbH", email: "info@korn.example" });
    expect(org.art).toBe("organisation");
    expect(org.passwortHash).toBeUndefined();
    expect(await istInhaber(musterstadt, org.id, chefin.id)).toBe(true);
    const azubi = await person("Azubi");
    const { vollmacht, code } = await erteile(musterstadt, org, { art: "organisation", anName: "Azubi", anEmail: "azubi@example.org", umfang: ["antraege", "termine", "post", "zahlungen"], rolle: "mitarbeiter" });
    await nimmAn(musterstadt, `${vollmacht.id}.${code}`, azubi);
    expect(await istInhaber(musterstadt, org.id, azubi.id)).toBe(false);
    expect((await erteilt(musterstadt, org.id)).map((m) => m.rolle).sort()).toEqual(["inhaber", "mitarbeiter"]);
  });

  it("löscht die Firma mit dem letzten Inhaber-Konto (keine verwaisten Firmen)", async () => {
    const inhaber = await person("Solo");
    const { org } = await erstelleOrganisation(musterstadt, inhaber, { name: "Solo e. K.", email: "solo@example.org" });
    await entferneKontoDaten(inhaber);
    expect(await ladeKonto(musterstadt, org.id)).toBeUndefined();
  });
});
