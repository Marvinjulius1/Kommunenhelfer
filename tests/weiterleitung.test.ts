import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { decryptJson } from "@/lib/crypto";
import { pruefeSignatur, signiere } from "@/lib/signatur";
import { erstelleVorgang, ladeMitCode, loescheAbgelaufene } from "@/lib/vorgaenge/service";
import { store } from "@/lib/storage/store";
import { blobs } from "@/lib/storage/blobs";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";

const daten: VorgangDaten = { kontakt: { name: "Erika Mustermann", email: "erika@example.org" }, nachricht: "Bitte bearbeiten" };

afterEach(() => vi.restoreAllMocks());

describe("Signierte Links", () => {
  it("prüft Signatur, Zweck und Ablauf", () => {
    const t = signiere({ d: "abc" }, 60, "dokument");
    expect(pruefeSignatur<{ d: string }>(t, "dokument")?.d).toBe("abc");
    expect(pruefeSignatur(t, "backoffice-sitzung")).toBeNull();
    expect(pruefeSignatur(t.slice(0, -2) + "xx", "dokument")).toBeNull();
    expect(pruefeSignatur(signiere({ d: "abc" }, -1, "dokument"), "dokument")).toBeNull();
  });
});

describe("Vorgang & Weiterleitung", () => {
  it("speichert Kontaktdaten verschlüsselt und prüft den Zugangscode", async () => {
    const { vorgangsnummer, zugangscode } = await erstelleVorgang({ tenant: musterstadt, quelle: "upload", amtId: "standesamt", daten, aufbewahrungTage: 30, basisUrl: "https://x" });
    const v = await store().get<VorgangRecord>("vorgaenge", vorgangsnummer);
    expect(JSON.stringify(v)).not.toContain("Erika");
    expect(decryptJson<VorgangDaten>(v!.daten).kontakt.name).toBe("Erika Mustermann");
    expect(await ladeMitCode(musterstadt, vorgangsnummer, zugangscode)).toBeTruthy();
    expect(await ladeMitCode(musterstadt, vorgangsnummer, "falsch")).toBeUndefined();
    expect(v!.weiterleitung).toMatchObject({ typ: "backoffice", ok: true });
  });

  it("E-Mail an das Amt enthält keine personenbezogenen Daten", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    process.env.MAIL_LOG_INHALT = "1";
    await erstelleVorgang({ tenant: musterstadt, quelle: "upload", amtId: "buergerbuero", daten, aufbewahrungTage: 30, basisUrl: "https://portal" });
    delete process.env.MAIL_LOG_INHALT;
    const anAmt = log.mock.calls.map((c) => String(c[0])).find((m) => m.includes("Neuer Vorgang"))!;
    expect(anAmt).toContain("https://portal/backoffice/vorgang/");
    expect(anAmt).not.toContain("Erika");
    expect(anAmt).not.toContain("erika@example.org");
  });

  it("Webhook: signiert (HMAC) und mit kurzlebigen Dokument-Links", async () => {
    process.env.TEST_WEBHOOK_SECRET = "geheim";
    const tenant = structuredClone(musterstadt);
    tenant.aemter[1].weiterleitung = { typ: "webhook", url: "https://fachverfahren.example/eingang", secretEnv: "TEST_WEBHOOK_SECRET" };
    await blobs.put("dokumentid-webhook-0001", Buffer.from("%PDF-1.4"));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await erstelleVorgang({
      tenant,
      quelle: "upload",
      amtId: tenant.aemter[1].id,
      daten,
      dokumente: [{ id: "dokumentid-webhook-0001", art: "geburtsurkunde", typ: "application/pdf", groesse: 8, name: "x" }],
      aufbewahrungTage: 30,
      basisUrl: "https://portal",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://fachverfahren.example/eingang");
    const body = String(init.body);
    const sig = (init.headers as Record<string, string>)["x-signatur"];
    expect(sig).toBe(`sha256=${createHmac("sha256", "geheim").update(body).digest("hex")}`);
    const link: string = JSON.parse(body).vorgang.dokumente[0].url;
    const token = pruefeSignatur<{ u: string; d: string }>(link.split("/api/dokument/")[1], "dokument");
    expect(token).toMatchObject({ u: "extern", d: "dokumentid-webhook-0001" });
    expect(token!.exp - Date.now() / 1000).toBeLessThanOrEqual(15 * 60);
  });

  it("Weiterleitungsfehler blockieren den Eingang nicht", async () => {
    const tenant = structuredClone(musterstadt);
    tenant.aemter[1].weiterleitung = { typ: "webhook", url: "https://fachverfahren.example/eingang", secretEnv: "FEHLT_ABSICHTLICH" };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { vorgangsnummer } = await erstelleVorgang({ tenant, quelle: "upload", amtId: tenant.aemter[1].id, daten, aufbewahrungTage: 30, basisUrl: "https://p" });
    const v = await store().get<VorgangRecord>("vorgaenge", vorgangsnummer);
    expect(v!.weiterleitung).toMatchObject({ ok: false });
  });

  it("Löschkonzept entfernt abgelaufene Vorgänge samt Dateien", async () => {
    await blobs.put("dokumentid-abgelaufen01", Buffer.from("x"));
    const { vorgangsnummer } = await erstelleVorgang({
      tenant: musterstadt,
      quelle: "upload",
      amtId: "standesamt",
      daten,
      dokumente: [{ id: "dokumentid-abgelaufen01", art: "sonstiges", typ: "application/pdf", groesse: 1, name: "x" }],
      aufbewahrungTage: 1,
      basisUrl: "https://p",
    });
    const v = (await store().get<VorgangRecord>("vorgaenge", vorgangsnummer))!;
    await store().put("vorgaenge", { ...v, loeschenAm: new Date(Date.now() - 1000).toISOString() });
    await loescheAbgelaufene();
    expect(await store().get("vorgaenge", vorgangsnummer)).toBeUndefined();
    expect(await blobs.get("dokumentid-abgelaufen01")).toBeNull();
  });
});
