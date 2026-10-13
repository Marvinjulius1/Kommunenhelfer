/**
 * Standard-Übermittlung: Der Antrag wird verschlüsselt im Portal gespeichert
 * und kann von der Verwaltung (künftig: Admin-Bereich) bearbeitet werden.
 */
import "server-only";
import { encryptJson, hashToken, vorgangsnummer, zugangscode } from "@/lib/crypto";
import { inTagen, store } from "@/lib/storage/store";
import type { AntragRecord } from "@/lib/records";
import type { SubmissionGateway } from "./index";

export const localGateway: SubmissionGateway = {
  id: "local",
  async einreichen({ tenant, leistung, daten }) {
    const id = vorgangsnummer(tenant.slug);
    const code = zugangscode();
    const jetzt = new Date().toISOString();
    const record: AntragRecord = {
      id,
      tenant: tenant.slug,
      leistungId: leistung.id,
      leistungsschluessel: leistung.leistungsschluessel,
      status: "eingegangen",
      verlauf: [{ status: "eingegangen", am: jetzt }],
      tokenHash: hashToken(code),
      daten: encryptJson(daten),
      erstelltAm: jetzt,
      loeschenAm: inTagen(leistung.formular?.aufbewahrungTage ?? 90),
    };
    await store().put("antraege", record);
    return { vorgangsnummer: id, zugangscode: code };
  },
};
