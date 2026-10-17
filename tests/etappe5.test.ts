import { createDecipheriv, generateKeyPairSync, privateDecrypt, constants } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { anwenden, type AnpassungRecord } from "@/lib/admin/anpassungen";
import { pruefeGemeinde } from "@/config/schema";
import { ideen, ideeSicht, legeUmfrageAn, moderiere, reicheIdeeEin, stimmeAb, umfrageSicht, unterstuetze, ladeUmfrage } from "@/lib/beteiligung/service";
import { jwe } from "@/lib/integrations/fitconnect";
import { sitzungen } from "@/lib/ratsinfo/service";
import { setzeVertretung, zustaendigFuer } from "@/lib/backoffice/vertretung";
import type { KontoRecord } from "@/lib/records";

const konto = (id: string, niveau: "basis" | "hoch" = "basis") => ({ id, tenant: musterstadt.slug, vertrauensniveau: niveau }) as unknown as KontoRecord;
const morgen = new Date(Date.now() + 86400_000).toISOString();

describe("FIT-Connect-Verschlüsselung (JWE)", () => {
  it("lässt sich mit dem privaten Schlüssel des Zustellpunkts wieder öffnen", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-kid" };
    const token = jwe(JSON.stringify({ hallo: "Fachdaten" }), jwk);
    const [h, ek, iv, ct, tag] = token.split(".");
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    expect(header).toMatchObject({ alg: "RSA-OAEP-256", enc: "A256GCM", kid: "test-kid" });
    const cek = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(ek, "base64url"));
    const d = createDecipheriv("aes-256-gcm", cek, Buffer.from(iv, "base64url"));
    d.setAAD(Buffer.from(h, "ascii"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    const klar = Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString();
    expect(JSON.parse(klar)).toEqual({ hallo: "Fachdaten" });
  });
});

describe("Umfragen", () => {
  it("zählt eine Stimme pro Konto und speichert nicht, wer was gewählt hat", async () => {
    const u = await legeUmfrageAn(musterstadt, { titel: "Testfrage", beschreibung: "", optionen: ["Ja", "Nein"], mehrfach: false, bis: morgen, ergebnisSofort: true, nurOnlineAusweis: false, autor: "test" });
    expect((await stimmeAb(musterstadt, u.id, konto("k1"), ["o1"])).ok).toBe(true);
    expect(await stimmeAb(musterstadt, u.id, konto("k1"), ["o2"])).toEqual({ ok: false, fehler: "schon_abgestimmt" });
    expect(await stimmeAb(musterstadt, u.id, konto("k2"), ["o1", "o2"])).toEqual({ ok: false, fehler: "ungueltig" });
    await stimmeAb(musterstadt, u.id, konto("k2"), ["o2"]);
    const s = umfrageSicht((await ladeUmfrage(musterstadt, u.id))!, konto("k1"));
    expect(s.teilgenommen).toBe(true);
    expect(s.ergebnis?.map((o) => o.stimmen)).toEqual([1, 1]);
    const roh = await fs.readFile(path.join(process.env.DATA_DIR!, "umfragen.json"), "utf8");
    expect(roh).not.toContain("k1");
  });
  it("gleichzeitige Stimmen gehen nicht verloren", async () => {
    const u = await legeUmfrageAn(musterstadt, { titel: "Parallel", beschreibung: "", optionen: ["A", "B"], mehrfach: false, bis: morgen, ergebnisSofort: true, nurOnlineAusweis: false, autor: "test" });
    await Promise.all(Array.from({ length: 20 }, (_, i) => stimmeAb(musterstadt, u.id, konto(`p${i}`), ["o1"])));
    expect((await ladeUmfrage(musterstadt, u.id))!.stimmen.o1).toBe(20);
  });
  it("verlangt bei Bedarf den Online-Ausweis", async () => {
    const u = await legeUmfrageAn(musterstadt, { titel: "Nur eID", beschreibung: "", optionen: ["A", "B"], mehrfach: false, bis: morgen, ergebnisSofort: false, nurOnlineAusweis: true, autor: "test" });
    expect(await stimmeAb(musterstadt, u.id, konto("k3"), ["o1"])).toEqual({ ok: false, fehler: "online_ausweis_noetig" });
    expect((await stimmeAb(musterstadt, u.id, konto("k3", "hoch"), ["o1"])).ok).toBe(true);
    expect(umfrageSicht((await ladeUmfrage(musterstadt, u.id))!).ergebnis).toBeUndefined(); // erst nach Ende
  });
});

describe("Ideen", () => {
  it("erscheinen erst nach Freigabe, eigene nicht selbst unterstützen", async () => {
    const r = await reicheIdeeEin(musterstadt, konto("autor"), { titel: "Mehr Bänke im Park", text: "Im Stadtpark fehlen Sitzgelegenheiten für ältere Menschen.", kategorie: "Umwelt und Grün" });
    if (!r.ok) throw new Error();
    expect((await ideen(musterstadt)).some((i) => i.id === r.idee.id)).toBe(false);
    expect((await ideen(musterstadt, konto("autor"))).some((i) => i.id === r.idee.id)).toBe(true);
    await moderiere(musterstadt, r.idee.id, { status: "veroeffentlicht", benutzer: "red" });
    expect((await ideen(musterstadt)).some((i) => i.id === r.idee.id)).toBe(true);
    expect((await unterstuetze(musterstadt, r.idee.id, konto("autor"), true))!.unterstuetzer.length).toBe(0);
    const u = (await unterstuetze(musterstadt, r.idee.id, konto("fan"), true))!;
    expect(ideeSicht(u, konto("fan"))).toMatchObject({ unterstuetzer: 1, unterstuetzt: true, eigene: false });
  });
});

describe("Admin-Anpassungen", () => {
  it("überschreibt nur die Abweichung und bleibt gültig", () => {
    const a = { id: "x", tenant: "musterstadt", leistungen: { "hund-anmelden": { aktiv: false, kurz: "Neuer kurzer Text für den Hund." } }, erstelltAm: "", loeschenAm: "" } as AnpassungRecord;
    const neu = anwenden(musterstadt, a);
    const h = neu.leistungen.find((l) => l.id === "hund-anmelden")!;
    expect(h.aktiv).toBe(false);
    expect(h.formular).toBeDefined();
    expect(pruefeGemeinde(neu)).toEqual([]);
  });
});

describe("Ratsinfo ohne OParl", () => {
  it("liefert die Sitzungen aus der Config, neueste zuerst", async () => {
    const s = await sitzungen(musterstadt);
    expect(s.length).toBe(3);
    expect(s[0].datum >= s[1].datum).toBe(true);
    expect(s.every((x) => x.quelle === "config")).toBe(true);
  });
});

describe("Vertretung", () => {
  it("die Vertretung sieht die Vorgänge der abwesenden Person", async () => {
    const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    await setzeVertretung(musterstadt, { benutzer: "anna", vertreter: "ben", von: heute, bis: heute });
    expect(await zustaendigFuer(musterstadt, "ben")).toEqual(["ben", "anna"]);
    expect(await zustaendigFuer(musterstadt, "anna")).toEqual(["anna"]);
  });
});
