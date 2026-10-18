/**
 * Status-Nachrichten zu einem Vorgang an selbst gewählte Kanäle (SMS, WhatsApp,
 * E-Mail) – auch ohne Bürgerkonto. Nachrichten nennen nur Vorgangsnummer und neuen
 * Stand; Inhalte (Rückfragen, Bescheide) stehen ausschließlich unter „Meine Anliegen“.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { sendeKurznachricht } from "@/lib/kurznachricht";
import { sendMail } from "@/lib/mail";
import type { Kanal, VorgangRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";

export type Anlass = "in_bearbeitung" | "erledigt" | "rueckfrage" | "bescheid" | "nachricht" | "zahlung";

const TEXT: Record<Anlass, string> = {
  in_bearbeitung: "wird jetzt bearbeitet",
  erledigt: "ist erledigt",
  rueckfrage: "– das Amt hat eine Rückfrage an Sie",
  bescheid: "– ein Bescheid liegt für Sie bereit",
  nachricht: "– eine neue Nachricht liegt für Sie bereit",
  zahlung: "– eine Gebühr ist zur Zahlung offen",
};

export function kanaeleVon(v: Pick<VorgangRecord, "benachrichtigung">): Kanal[] {
  return v.benachrichtigung ? decryptJson<Kanal[]>(v.benachrichtigung) : [];
}

export async function setzeKanaele(v: VorgangRecord, kanaele: Kanal[]) {
  const neu: VorgangRecord = { ...v, benachrichtigung: kanaele.length ? encryptJson(kanaele.slice(0, 3)) : undefined };
  await store().put("vorgaenge", neu);
  return neu;
}

/** Für die Anzeige: nur Art und gekürztes Ziel */
export function kanalSicht(k: Kanal) {
  return { kanal: k.kanal, ziel: k.ziel.includes("@") ? k.ziel.replace(/^(.{1,2}).*(@.*)$/, "$1…$2") : `${k.ziel.slice(0, 3)} … ${k.ziel.slice(-3)}` };
}

export function kurztext(tenant: GemeindeConfig, vorgangId: string, anlass: Anlass) {
  return `${tenant.art} ${tenant.name}: Ihr Anliegen ${vorgangId} ${TEXT[anlass]}. Details im Bürgerservice-Portal unter „Meine Anliegen“.`;
}

/**
 * Meldet einen neuen Stand. E-Mail nur bei Statuswechseln – Rückfragen und Bescheide
 * melden bereits die bestehenden E-Mails an die Kontaktadresse.
 */
export async function meldeStand(tenant: GemeindeConfig, v: Pick<VorgangRecord, "id" | "benachrichtigung">, anlass: Anlass): Promise<number> {
  let n = 0;
  for (const k of kanaeleVon(v)) {
    if (k.kanal === "email") {
      if (anlass !== "in_bearbeitung" && anlass !== "erledigt") continue;
      await sendMail(tenant, {
        to: k.ziel,
        subject: `Neuer Stand: Ihr Anliegen ${v.id}`,
        text: `Guten Tag,\n\n${kurztext(tenant, v.id, anlass)}\n\nSie erhalten diese Nachricht, weil Sie Benachrichtigungen zu diesem Anliegen bestellt haben. Abbestellen können Sie sie unter „Meine Anliegen“.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
      }).catch(() => undefined);
      n++;
    } else if (await sendeKurznachricht(tenant, k.kanal, k.ziel, kurztext(tenant, v.id, anlass))) n++;
  }
  return n;
}
