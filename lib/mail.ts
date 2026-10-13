/**
 * E-Mail-Versand.
 *
 * MAIL_TRANSPORT=console (Standard): Mails werden nur ins Server-Log geschrieben.
 * MAIL_TRANSPORT=smtp: Versand über SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
 *   – bitte einen Anbieter mit Serverstandort in der EU verwenden.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendMail(tenant: GemeindeConfig, mail: Mail): Promise<void> {
  const from = `"${tenant.email.absenderName}" <${tenant.email.absenderAdresse}>`;
  if (process.env.MAIL_TRANSPORT === "smtp") {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transporter.sendMail({ from, ...mail });
    return;
  }
  // Entwicklungsmodus: keine echten Mails. Empfängeradresse wird gekürzt geloggt.
  const masked = mail.to.replace(/^(.).*(@.*)$/, "$1…$2");
  console.info(`[mail] an ${masked} | ${mail.subject}\n${mail.text}\n`);
}

/** Erstellt einen Kalendereintrag (iCalendar) für Terminbestätigungen. */
export function ics(opts: { uid: string; start: Date; minuten: number; titel: string; ort: string; beschreibung: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const end = new Date(opts.start.getTime() + opts.minuten * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Buergerportal//DE",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.titel)}`,
    `LOCATION:${esc(opts.ort)}`,
    `DESCRIPTION:${esc(opts.beschreibung)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
