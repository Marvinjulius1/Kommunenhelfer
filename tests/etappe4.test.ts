import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { findeAusweis, merkeVor, normalisiereNummer, setzeAusweisStatus } from "@/lib/ausweis/service";
import { erfasseFund, fundsachen, suche } from "@/lib/fundbuero/service";
import { anzeigeNummer, geoeffnet, ladeNummer, position, rufeAuf, schliesseAb, zieheNummer } from "@/lib/wartezeit/service";
import { abgedeckt, zuordnung } from "@/components/flow/Unterlagen";
import type { Anhang } from "@/lib/client/uploads";
import { promises as fs } from "node:fs";
import path from "node:path";

const buergerbuero = musterstadt.aemter.find((a) => a.id === "buergerbuero")!;

describe("Ausweis-Status", () => {
  it("normalisiert Antragsnummern", () => {
    expect(normalisiereNummer("l01x 00t47-1")).toBe("L01X00T471");
    expect(normalisiereNummer("123")).toBeUndefined();
    expect(normalisiereNummer("<script>")).toBeUndefined();
  });
  it("speichert die Nummer nur als Prüfwert und benachrichtigt vorgemerkte Konten", async () => {
    await merkeVor(musterstadt, "T22000129", "konto-1");
    expect((await findeAusweis(musterstadt, "T22000129"))!.status).toBe("unbekannt");
    const r = await setzeAusweisStatus(musterstadt, "T22000129", "abholbereit", "personalausweis");
    expect(r.benachrichtigt).toBe(1);
    // erneutes Setzen benachrichtigt nicht doppelt
    expect((await setzeAusweisStatus(musterstadt, "T22000129", "abholbereit")).benachrichtigt).toBe(0);
    const roh = await fs.readFile(path.join(process.env.DATA_DIR!, "ausweise.json"), "utf8");
    expect(roh).not.toContain("T22000129");
  });
});

describe("Fundbüro", () => {
  it("findet erfasste und Beispiel-Fundsachen, interne Merkmale bleiben verschlüsselt", async () => {
    await erfasseFund(musterstadt, { bezeichnung: "Brille", kategorie: "Sonstiges", beschreibung: "Schwarzes Gestell", fundort: "Rathaus", funddatum: "2026-10-15", intern: "Gravur GEHEIM-123", benutzer: "test" });
    const alle = await fundsachen(musterstadt);
    expect(suche(alle, "brille").length).toBe(1);
    expect(suche(alle, "schlüssel").length).toBeGreaterThan(0);
    expect(suche(alle, "", "Fahrrad").every((f) => f.kategorie === "Fahrrad")).toBe(true);
    expect(JSON.stringify(alle)).not.toContain("GEHEIM");
    const roh = await fs.readFile(path.join(process.env.DATA_DIR!, "fundsachen.json"), "utf8");
    expect(roh).not.toContain("GEHEIM");
  });
});

describe("Wartenummern", () => {
  it("vergibt fortlaufende Nummern auch bei gleichzeitigen Anfragen", async () => {
    const r = await Promise.all([1, 2, 3, 4].map(() => zieheNummer(musterstadt, buergerbuero)));
    expect(r.map((x) => x.record.nummer).sort()).toEqual([1, 2, 3, 4]);
    expect(anzeigeNummer(buergerbuero, 4)).toBe("B004");
  });
  it("Position, Aufruf und Zugriff nur mit Token", async () => {
    const { record, token } = await zieheNummer(musterstadt, buergerbuero);
    expect(await ladeNummer(musterstadt, record.id, "falsch")).toBeUndefined();
    const w = (await ladeNummer(musterstadt, record.id, token))!;
    expect((await position(musterstadt, w)).vor).toBe(4);
    const erster = await rufeAuf(musterstadt, buergerbuero, "Platz 1");
    expect(erster!.nummer).toBe(1);
    expect(await schliesseAb(musterstadt, erster!.id, "erledigt")).toBe(true);
    expect((await position(musterstadt, w)).vor).toBe(3);
  });
  it("kennt Öffnungszeiten, Feiertage und Wochenenden", () => {
    // Dienstag 20.10.2026, 10:00 Uhr Berlin (UTC+2)
    expect(geoeffnet(musterstadt, buergerbuero, new Date("2026-10-20T08:00:00Z"))).toBe(true);
    expect(geoeffnet(musterstadt, buergerbuero, new Date("2026-10-20T11:00:00Z"))).toBe(false); // 13 Uhr
    expect(geoeffnet(musterstadt, buergerbuero, new Date("2026-10-18T08:00:00Z"))).toBe(false); // Sonntag
    expect(geoeffnet(musterstadt, buergerbuero, new Date("2026-12-25T09:00:00Z"))).toBe(false); // Weihnachten
  });
});

describe("Unterlagen im Antrag", () => {
  const gewerbe = musterstadt.leistungen.find((l) => l.id === "gewerbe-anmelden")!;
  const anhang = (id: string, art?: string): Anhang => ({ lokalId: id, name: id, groesse: 1, typ: "application/pdf", status: "fertig", fortschritt: 1, hash: id, art });
  it("ordnet erkannte und unerkannte Dateien den gefragten Unterlagen zu", () => {
    expect(zuordnung(gewerbe, [anhang("a", "sonstiges")], {})).toEqual({ a: "personalausweis" });
    expect(zuordnung(gewerbe, [anhang("a", "personalausweis"), anhang("b")], {})).toEqual({ a: "personalausweis", b: "sonstiges" });
    expect(zuordnung(gewerbe, [anhang("a", "personalausweis")], { a: "reisepass" })).toEqual({ a: "reisepass" });
  });
  it("Reisepass deckt Personalausweis ab", () => {
    expect(abgedeckt(["reisepass"]).has("personalausweis")).toBe(true);
  });
});
