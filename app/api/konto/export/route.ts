/** DSGVO Art. 15/20: Alle gespeicherten Daten als JSON herunterladen. */
import { tenantAus } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { mitKonto } from "@/lib/konto/api";
import { anliegenVon, profilVon, sitzungenVon } from "@/lib/konto/service";
import type { PostfachRecord, SafeRecord, VorgangDaten, ZahlungRecord } from "@/lib/records";
import { postSicht } from "@/lib/postfach/service";
import { safeSicht } from "@/lib/safe/service";
import { store, type StoredRecord } from "@/lib/storage/store";
import { nachrichten } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const k = ctx.konto;
  const { vorgaenge, termine } = await anliegenVon(k);
  const eigene = <T extends StoredRecord & { kontoId?: string }>(s: string) => store().list<T>(s, (x) => x.kontoId === k.id);
  const weitere = {
    postfach: (await eigene<PostfachRecord>("postfach")).map(postSicht),
    zahlungen: (await eigene<ZahlungRecord>("zahlungen")).map(({ id, betragCent, zweck, status, methode, bezahltAm, erstelltAm }) => ({ id, betrag: betragCent / 100, zweck, status, methode, bezahltAm, erstelltAm })),
    dokumentensafe: (await eigene<SafeRecord>("safe")).map(safeSicht),
    checklisten: await eigene("checklisten"),
  };
  const daten = {
    exportiertAm: new Date().toISOString(),
    gemeinde: `${tenant.art} ${tenant.name}`,
    konto: { erstelltAm: k.erstelltAm, vertrauensniveau: k.vertrauensniveau, einstellungen: k.einstellungen, profil: profilVon(k) },
    sitzungen: await sitzungenVon(k),
    vorgaenge: vorgaenge.map((v) => ({ id: v.id, leistung: v.leistungId, status: v.status, verlauf: v.verlauf, angaben: decryptJson<VorgangDaten>(v.daten), nachrichten: nachrichten(v), dokumente: v.dokumente.length, erstelltAm: v.erstelltAm })),
    termine: termine.map((t) => ({ id: t.id, amt: t.amtId, leistung: t.leistungId, slot: t.slot, status: t.status })),
    ...weitere,
  };
  return new Response(JSON.stringify(daten, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meine-daten-${tenant.slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
