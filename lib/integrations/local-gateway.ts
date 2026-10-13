/**
 * Standard-Übermittlung: Der Antrag wird als Vorgang verschlüsselt im Portal
 * gespeichert, laut Konfiguration an das Amt weitergeleitet und ist im
 * Backoffice bearbeitbar.
 */
import "server-only";
import { erstelleVorgang } from "@/lib/vorgaenge/service";
import type { SubmissionGateway } from "./index";

export const localGateway: SubmissionGateway = {
  id: "local",
  async einreichen({ tenant, leistung, daten, basisUrl }) {
    return erstelleVorgang({
      tenant,
      quelle: "formular",
      leistung,
      amtId: leistung.amtId ?? tenant.uploads.standardAmtId,
      daten: {
        kontakt: {
          name: [daten.vorname, daten.nachname].filter(Boolean).join(" ") || "Antragsteller/in",
          email: daten.email,
          telefon: daten.telefon,
        },
        werte: daten,
      },
      aufbewahrungTage: leistung.formular?.aufbewahrungTage ?? tenant.uploads.aufbewahrungTage,
      basisUrl,
    });
  },
};
