/**
 * Audit-Log: wer hat wann welchen Vorgang/welches Dokument geöffnet oder geändert.
 * Enthält keine Inhalte und keine Ausweisdaten. Aufbewahrung: 1 Jahr.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { AuditRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

type AuditEintrag = Pick<AuditRecord, "tenant" | "benutzer" | "aktion" | "vorgangId" | "dokumentId" | "details">;

export async function protokolliere(e: AuditEintrag) {
  const jetzt = new Date();
  await store().put<AuditRecord>("audit", {
    ...e,
    id: randomBytes(12).toString("base64url"),
    erstelltAm: jetzt.toISOString(),
    loeschenAm: inTagen(365, jetzt),
  });
}

export async function auditFuerVorgang(tenant: string, vorgangId: string): Promise<AuditRecord[]> {
  const liste = await store().list<AuditRecord>("audit", (a) => a.tenant === tenant && a.vorgangId === vorgangId);
  return liste.sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}
