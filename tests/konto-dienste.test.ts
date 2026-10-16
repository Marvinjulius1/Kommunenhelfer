import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { encryptJson } from "@/lib/crypto";
import { postFuerVorgang, postSicht, stelleZu } from "@/lib/postfach/service";
import { blobs } from "@/lib/storage/blobs";
import { betragFuer, euro, legeZahlungAn, ladeZahlung, markiereBezahlt, pruefeZahlungZugang, zahlungZugang } from "@/lib/zahlung/service";

const leistung = (id: string) => musterstadt.leistungen.find((l) => l.id === id)!;

describe("Gebühren für Online-Bezahlung", () => {
  it("berechnet Festbetrag", () => {
    expect(betragFuer(leistung("meldebescheinigung"), {})).toBe(1000);
  });
  it("berechnet erste und weitere Ausfertigungen", () => {
    const l = leistung("geburtsurkunde");
    expect(betragFuer(l, { anzahl: "1" })).toBe(1200);
    expect(betragFuer(l, { anzahl: "3" })).toBe(1200 + 2 * 600);
  });
  it("ignoriert unsinnige Mengen", () => {
    const l = leistung("geburtsurkunde");
    expect(betragFuer(l, { anzahl: "-4" })).toBe(1200);
    expect(betragFuer(l, { anzahl: "abc" })).toBe(1200);
  });
  it("liefert null ohne Bezahlkonfiguration", () => {
    expect(betragFuer(leistung("hund-abmelden"), {})).toBeNull();
  });
  it("formatiert Euro", () => {
    expect(euro(1250).replace(/\s/g, " ")).toBe("12,50 €");
  });
});

describe("Zahlungszugang", () => {
  it("signierter Link gilt nur für genau diese Zahlung", async () => {
    const z = await legeZahlungAn(musterstadt, { betragCent: 1000, zweck: "Test" });
    const t = zahlungZugang(z);
    expect(pruefeZahlungZugang(t, z.id)).toBe(true);
    expect(pruefeZahlungZugang(t, "Zanderer")).toBe(false);
    // ein Zeichen mitten in der Signatur ändern (am Ende könnten nur Füllbits betroffen sein)
    const i = t.length - 10;
    expect(pruefeZahlungZugang(t.slice(0, i) + (t[i] === "A" ? "B" : "A") + t.slice(i + 1), z.id)).toBe(false);
    expect(pruefeZahlungZugang(null, z.id)).toBe(false);
  });
  it("bezahlt nur einmal", async () => {
    const z = await legeZahlungAn(musterstadt, { betragCent: 500, zweck: "Test" });
    const a = await markiereBezahlt(z, "karte", "TEST-1");
    const b = await markiereBezahlt((await ladeZahlung(musterstadt, z.id))!, "karte", "TEST-2");
    expect(a.status).toBe("bezahlt");
    expect(b.referenz).toBe("TEST-1");
  });
  it("ist mandantengetrennt", async () => {
    const z = await legeZahlungAn(musterstadt, { betragCent: 500, zweck: "Test" });
    expect(await ladeZahlung({ ...musterstadt, slug: "andere" }, z.id)).toBeUndefined();
  });
});

describe("Postfach", () => {
  it("speichert Inhalt und Dokument verschlüsselt", async () => {
    const geheim = "Bescheid-Inhalt-Geheim-4711";
    const r = await stelleZu({
      tenant: musterstadt,
      art: "bescheid",
      titel: "Ihr Bescheid",
      text: geheim,
      absender: "Bürgerbüro",
      datei: { daten: Buffer.from(`%PDF-1.4 ${geheim}`), name: "bescheid.pdf", typ: "application/pdf" },
    });
    expect(JSON.stringify(r)).not.toContain(geheim);
    const roh = await fs.readdir(process.env.DATA_DIR!, { recursive: true });
    for (const f of roh) {
      const p = path.join(process.env.DATA_DIR!, String(f));
      if ((await fs.stat(p)).isFile()) expect((await fs.readFile(p)).toString("latin1")).not.toContain(geheim);
    }
    expect(postSicht(r).text).toBe(geheim);
    expect((await blobs.get(r.dokument!.id))!.toString()).toContain(geheim);
  });
  it("findet Post zu einem Vorgang", async () => {
    await stelleZu({ tenant: musterstadt, art: "nachricht", titel: "Hallo", text: "x", absender: "A", vorgang: { id: "V-TEST", daten: encryptJson({ kontakt: { email: "a@b.example" } }) } as never });
    expect((await postFuerVorgang(musterstadt.slug, "V-TEST")).length).toBe(1);
  });
});
