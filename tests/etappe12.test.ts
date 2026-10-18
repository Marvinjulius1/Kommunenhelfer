import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pruefeGemeinde } from "@/config/schema";
import { anwenden } from "@/lib/admin/anpassungen";
import { pruefeIdToken, rechteAus, type SsoAnbieter } from "@/lib/backoffice/sso";
import { antragsschluss, berlinZeit, briefwahlLeistung, offen, personSchluessel } from "@/lib/briefwahl/wahlen";
import { leseXml, textVon, erstes, XmlFehler } from "@/lib/import/xml";
import { alsLeistung, htmlZuText, leseXzufi } from "@/lib/import/xzufi";
import { beendeLage, aktuelleLage, leereLage, meldeLage, setzeLage } from "@/lib/krise/service";
import { KRISEN_ARTEN, VORLAGEN } from "@/lib/krise/vorlagen";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";

afterEach(() => vi.unstubAllGlobals());

describe("Briefwahl", () => {
  it("Antragsschluss: zweiter Tag vor der Wahl, 18 Uhr deutscher Zeit (Winter und Sommer)", () => {
    expect(antragsschluss({ id: "a", titel: "Wahl", datum: "2026-11-22" }).toISOString()).toBe("2026-11-20T17:00:00.000Z");
    expect(antragsschluss({ id: "b", titel: "Wahl", datum: "2027-06-13" }).toISOString()).toBe("2027-06-11T16:00:00.000Z");
    expect(berlinZeit("2026-03-29", "12:00").toISOString()).toBe("2026-03-29T10:00:00.000Z");
    const w = { id: "c", titel: "Wahl", datum: "2026-11-22" };
    expect(offen(w, new Date("2026-11-20T16:59:00Z"))).toBe(true);
    expect(offen(w, new Date("2026-11-20T17:00:00Z"))).toBe(false);
    expect(antragsschluss({ ...w, antragBis: "2026-11-19T12:00:00+01:00" }).toISOString()).toBe("2026-11-19T11:00:00.000Z");
  });

  it("erkennt Doppelanträge unabhängig von Schreibweise", () => {
    const a = personSchluessel("w1", { nachname: "Müller", vorname: "Jörg", geburtsdatum: "1970-01-01" });
    expect(personSchluessel("w1", { nachname: "MUELLER ", vorname: "joerg", geburtsdatum: "1970-01-01" })).toBe(a);
    expect(personSchluessel("w1", { nachname: "Müller", vorname: "Jörg", geburtsdatum: "1970-01-01" })).toBe(a);
    expect(personSchluessel("w2", { nachname: "Müller", vorname: "Jörg", geburtsdatum: "1970-01-01" })).not.toBe(a);
    expect(personSchluessel("w1", { nachname: "Müller", vorname: "Jörg", geburtsdatum: "1970-01-02" })).not.toBe(a);
  });

  it("Antrag ist eine gültige Leistung – online nur, solange eine Wahl offen ist", () => {
    const w = { id: "bgm", titel: "Bürgermeisterwahl", datum: "2026-11-22" };
    const l = briefwahlLeistung(musterstadt, [w]);
    expect(pruefeGemeinde({ ...musterstadt, leistungen: [...musterstadt.leistungen, l] })).toEqual([]);
    expect(l.online).toBe(true);
    expect(l.formular?.schritte[0].felder[0].optionen?.[0].wert).toBe("bgm");
    expect(l.amtId).toBe("buergerbuero");
    const zu = briefwahlLeistung(musterstadt, []);
    expect(zu.online).toBe(false);
    expect(zu.formular).toBeUndefined();
  });
});

describe("Krisenmodus", () => {
  it("Vorlagen sind vollständig", () => {
    for (const a of KRISEN_ARTEN) expect(VORLAGEN[a].label).toBeTruthy();
    const l = leereLage(musterstadt, "trinkwasser");
    expect(l.text).toContain("Stadt Musterstadt");
    expect(l.notrufe.map((n) => n.nummer)).toEqual(["112", "110", "116 117"]);
  });

  it("aktivieren, Lagemeldungen, beenden – neue Lage beginnt ohne alte Meldungen", async () => {
    expect(await aktuelleLage(musterstadt)).toBeUndefined();
    const { meldungen: _, ...lage } = leereLage(musterstadt, "hochwasser");
    await setzeLage(musterstadt, lage, "test");
    await meldeLage(musterstadt, "Pegel steigt nicht weiter.", "test");
    expect((await aktuelleLage(musterstadt))?.meldungen.map((m) => m.text)).toEqual(["Pegel steigt nicht weiter."]);
    await setzeLage(musterstadt, { ...lage, titel: "Hochwasser – Lage entspannt sich" }, "test");
    expect((await aktuelleLage(musterstadt))?.meldungen).toHaveLength(1);
    await beendeLage(musterstadt, "test");
    expect(await aktuelleLage(musterstadt)).toBeUndefined();
    expect(await meldeLage(musterstadt, "zu spät", "test")).toBeUndefined();
    await setzeLage(musterstadt, lage, "test");
    expect((await aktuelleLage(musterstadt))?.meldungen).toEqual([]);
    await beendeLage(musterstadt, "test");
  });

  it("bleibt aus, wenn die Funktion abgeschaltet ist", async () => {
    const aus = { ...musterstadt, funktionen: { ...musterstadt.funktionen, krisenmodus: false } };
    const { meldungen: _, ...lage } = leereLage(musterstadt);
    await setzeLage(musterstadt, lage, "test");
    expect(await aktuelleLage(aus)).toBeUndefined();
    await beendeLage(musterstadt, "test");
  });
});

describe("XML und XZuFi", () => {
  it("liest Elemente, Attribute, Entitäten und CDATA – lehnt DOCTYPE ab", () => {
    const d = leseXml(`<?xml version="1.0"?><a:x xmlns:a="u"><a:y n="1 &amp; 2">A &lt;b&gt; <![CDATA[<c>]]></a:y></a:x>`);
    const y = erstes(d, "y")!;
    expect(y.attr.n).toBe("1 & 2");
    expect(textVon(y)).toBe("A <b> <c>");
    expect(() => leseXml(`<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>`)).toThrow(XmlFehler);
    expect(() => leseXml(`<x><y></x>`)).toThrow(XmlFehler);
    expect(() => leseXml(`<x>`)).toThrow(XmlFehler);
  });

  it("macht aus HTML reinen Text – ohne Skripte", () => {
    expect(htmlZuText("<p>Eins</p><script>alert(1)</script><ul><li>A</li><li>B</li></ul>")).toBe("Eins\n• A\n• B");
  });

  it("übernimmt Leistungen aus einem XZuFi-Export", () => {
    const xml = readFileSync(path.join(__dirname, "fixtures/xzufi-beispiel.xml"), "utf8");
    const [hund, werbung] = leseXzufi(xml);
    expect(hund.titel).toBe("Hundesteuer Anmeldung");
    expect(hund.leistungsschluessel).toBe("99108008000000");
    expect(hund.kurz).toBe("Wenn Sie einen Hund halten, müssen Sie ihn bei der Gemeinde anmelden.");
    expect(hund.beschreibung).toContain("zwei Wochen");
    expect(hund.beschreibung).not.toMatch(/alert|<|>/);
    expect(hund.unterlagen).toEqual(["Personalausweis", "Nachweis der Haftpflichtversicherung"]);
    expect(hund.fristen).toEqual(["Innerhalb von zwei Wochen nach Beginn der Haltung."]);
    expect(hund.gebuehren).toEqual([{ bezeichnung: "Anmeldung", betrag: null }]);
    expect(hund.stichworte).toContain("hund anmelden");
    expect(werbung.titel).toBe("Sondernutzungserlaubnis für Werbeaufsteller");
    expect(werbung.gebuehren[0].betrag).toBe("Nach Gebührensatzung, je Aufsteller und Monat.");

    const belegt = new Set(musterstadt.leistungen.map((l) => l.id));
    const neu = [hund, werbung].map((x) => alsLeistung(x, "ordnungsamt", belegt));
    expect(new Set(neu.map((l) => l.id)).size).toBe(2);
    const cfg = anwenden(musterstadt, { id: "m", tenant: "musterstadt", erstelltAm: "", loeschenAm: "", leistungen: {}, eigeneLeistungen: neu });
    expect(pruefeGemeinde(cfg)).toEqual([]);
  });
});

describe("Anmeldung mit dem Rathaus-Konto (OIDC)", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", use: "sig" };
  const a: SsoAnbieter = { gemeinde: "musterstadt", name: "Test", issuer: "https://idp.example", clientId: "portal", gruppen: { g1: { aemter: ["steueramt"] }, g2: { aemter: ["buergerbuero"], rollen: ["redaktion"] } } };
  const d = { issuer: a.issuer, authorization_endpoint: "", token_endpoint: "", jwks_uri: "https://idp.example/jwks" };
  const jetzt = Math.floor(Date.now() / 1000);
  const token = (claims: Record<string, unknown>, kopf: Record<string, unknown> = { alg: "RS256", kid: "k1" }) => {
    const k = Buffer.from(JSON.stringify(kopf)).toString("base64url");
    const p = Buffer.from(JSON.stringify({ iss: a.issuer, aud: "portal", exp: jetzt + 300, iat: jetzt, nonce: "n1", sub: "u1", ...claims })).toString("base64url");
    return `${k}.${p}.${sign("sha256", Buffer.from(`${k}.${p}`), privateKey).toString("base64url")}`;
  };
  const mitJwks = () => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } })));

  it("prüft Signatur, Aussteller, Empfänger, Ablauf und Nonce", async () => {
    mitJwks();
    expect((await pruefeIdToken(token({ preferred_username: "anna" }), a, d, "n1")).preferred_username).toBe("anna");
    await expect(pruefeIdToken(token({}), a, d, "falsch")).rejects.toThrow(/Nonce/);
    await expect(pruefeIdToken(token({ aud: "anderes" }), a, d, "n1")).rejects.toThrow(/Audience/);
    await expect(pruefeIdToken(token({ iss: "https://boese.example" }), a, d, "n1")).rejects.toThrow(/Issuer/);
    await expect(pruefeIdToken(token({ exp: jetzt - 3600 }), a, d, "n1")).rejects.toThrow(/abgelaufen/);
    const t = token({}).split(".");
    const manipuliert = Buffer.from(JSON.stringify({ iss: a.issuer, aud: "portal", exp: jetzt + 300, nonce: "n1", sub: "admin" })).toString("base64url");
    await expect(pruefeIdToken(`${t[0]}.${manipuliert}.${t[2]}`, a, d, "n1")).rejects.toThrow(/Signatur/);
    await expect(pruefeIdToken(token({}, { alg: "none" }), a, d, "n1")).rejects.toThrow(/nicht erlaubt/);
    await expect(pruefeIdToken(token({}, { alg: "HS256" }), a, d, "n1")).rejects.toThrow(/nicht erlaubt/);
  });

  it("vergibt Rechte nur über Gruppen oder App-Rollen", () => {
    expect(rechteAus(a, { groups: ["g1", "x"] })).toEqual({ aemter: ["steueramt"] });
    expect(rechteAus(a, { groups: ["g1"], roles: ["g2"] })).toEqual({ aemter: ["steueramt", "buergerbuero"], rollen: ["redaktion"] });
    expect(rechteAus(a, { groups: ["fremd"] })).toBeUndefined();
    expect(rechteAus({ ...a, standard: { aemter: ["buergerbuero"] } }, {})).toEqual({ aemter: ["buergerbuero"] });
  });
});
