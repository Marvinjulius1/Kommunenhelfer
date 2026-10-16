import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";
import { euro, ladeZahlung, pruefeZahlungZugang } from "@/lib/zahlung/service";

export const metadata: Metadata = { title: "Quittung", robots: { index: false } };
export const dynamic = "force-dynamic";

const METHODE: Record<string, string> = { karte: "Kreditkarte", paypal: "PayPal", wallet: "Apple Pay / Google Pay", wero: "Wero", lastschrift: "SEPA-Lastschrift" };

export default async function Quittung({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const tenant = await getTenant();
  const z = await ladeZahlung(tenant, (await params).id);
  const konto = await aktuellesKonto(tenant);
  if (!z || z.status !== "bezahlt" || !((konto && z.kontoId === konto.id) || pruefeZahlungZugang((await searchParams).t, z.id))) notFound();
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });
  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
      <Glass className="rounded-[24px] p-8 print:shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-subtle">Zahlungsbestätigung</p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em]">
              {tenant.art} {tenant.name}
            </h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tenant.wappen} alt="" width={120} height={140} className="h-12 w-auto" />
        </div>
        <dl className="mt-8 grid gap-4 text-[15px]">
          {[
            ["Betrag", euro(z.betragCent)],
            ["Verwendungszweck", z.zweck],
            ["Bezahlt am", fmt.format(new Date(z.bezahltAm!))],
            ["Zahlungsart", METHODE[z.methode ?? ""] ?? z.methode ?? "–"],
            ["Referenz", z.referenz ?? z.id],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[12px] text-subtle">
          {tenant.kontakt.strasse}, {tenant.kontakt.plz} {tenant.kontakt.ort}. Diese Bestätigung wurde maschinell erstellt und ist ohne Unterschrift gültig.
          {z.referenz?.startsWith("TEST-") ? " TESTZAHLUNG – es wurde kein Geld bewegt." : ""}
        </p>
      </Glass>
    </div>
  );
}
