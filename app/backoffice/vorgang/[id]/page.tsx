import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VorgangAktionen, Wiedervorlage } from "@/components/backoffice/Aktionen";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { auditFuerVorgang, protokolliere } from "@/lib/backoffice/audit";
import { aktuellerBenutzer, benutzerListe, darfAmt } from "@/lib/backoffice/auth";
import { aktiveVertretungen } from "@/lib/backoffice/vertretung";
import { aktiv } from "@/lib/funktionen";
import { postFuerVorgang, postSicht } from "@/lib/postfach/service";
import { euro, zahlungenVon } from "@/lib/zahlung/service";
import { decryptJson } from "@/lib/crypto";
import { anzeigeWert } from "@/lib/flows/validate";
import { tx } from "@/lib/i18n";
import { VORGANG_STATUS, type VorgangDaten } from "@/lib/records";
import { getTenant } from "@/lib/tenant";
import { artLabel } from "@/lib/uploads/pruefung";
import { formatGroesse } from "@/lib/uploads/formate";
import { ladeVorgang, nachrichten, STATUS_LABEL } from "@/lib/vorgaenge/service";
import { dokumentLink } from "@/lib/vorgaenge/weiterleitung";
import { fristlage } from "@/lib/vorgaenge/fristen";

export const dynamic = "force-dynamic";

const AKTION: Record<string, string> = {
  anmeldung: "Anmeldung",
  anmeldung_fehlgeschlagen: "Fehlgeschlagene Anmeldung",
  vorgang_geoeffnet: "Vorgang geöffnet",
  dokument_geoeffnet: "Dokument geöffnet",
  dokument_extern_abgerufen: "Dokument von Schnittstelle abgerufen",
  status_geaendert: "Status geändert",
  rueckfrage_gesendet: "Rückfrage gesendet",
  bescheid_zugestellt: "Bescheid zugestellt",
  zahlung_angefordert: "Zahlung angefordert",
  zugewiesen: "Zugewiesen",
  wiedervorlage: "Wiedervorlage",
  entwurf_erstellt: "Entwurf vorgeschlagen",
  vorgang_exportiert: "Als PDF exportiert",
};

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <Glass className="rounded-[24px] p-6">
      <h2 className="mb-4 text-[13px] font-medium text-subtle">{titel}</h2>
      {children}
    </Glass>
  );
}

export default async function VorgangDetail({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  const v = await ladeVorgang(tenant, (await params).id);
  if (!v || !darfAmt(b, v.amtId)) notFound();

  await protokolliere({ tenant: tenant.slug, benutzer: b.name, aktion: "vorgang_geoeffnet", vorgangId: v.id });
  const d = decryptJson<VorgangDaten>(v.daten);
  const l = tenant.leistungen.find((x) => x.id === v.leistungId);
  const amt = tenant.aemter.find((x) => x.id === v.amtId);
  const felder = l?.formular?.schritte.flatMap((s) => s.felder) ?? [];
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const audit = (await auditFuerVorgang(tenant.slug, v.id)).slice(0, 20);
  const post = (await postFuerVorgang(tenant.slug, v.id)).map(postSicht);
  const abwesend = await aktiveVertretungen(tenant);
  const mangelKat = v.mangel ? tenant.maengel?.kategorien.find((k) => k.id === v.mangel!.kategorie) : undefined;
  const zahlungen = await zahlungenVon((z) => z.tenant === tenant.slug && z.vorgangId === v.id);
  // Relative Links: gültig 5 Minuten, nur mit dieser Sitzung
  const fl = fristlage(tenant, v, new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }));
  const links = Object.fromEntries(v.dokumente.map((dok) => [dok.id, dokumentLink("", v, dok.id, b.name, 5 * 60)]));

  return (
    <div>
      <Link href="/backoffice" className="inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
        <Icon name="chevronLeft" className="size-4" />
        Alle Vorgänge
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{l ? tx(l.titel, "de") : mangelKat ? `Mängelmeldung: ${tx(mangelKat.label, "de")}` : "Sonstiges Anliegen"}</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="font-mono">{v.id}</span> · {amt ? tx(amt.name, "de") : v.amtId} · eingegangen {fmt.format(new Date(v.erstelltAm))} · {v.quelle === "upload" ? "Upload über Assistent" : v.quelle === "mangel" ? "Mängelmelder" : "Online-Antrag"}
            {v.zugewiesen ? ` · bei ${v.zugewiesen}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/backoffice/vorgang/${v.id}/pdf`} className="pressable inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-4 py-1 text-[13px]">
            <Icon name="file" className="size-4" />
            Als PDF
          </a>
          <span className="rounded-full bg-[var(--line)] px-4 py-1 text-[13px]">{STATUS_LABEL[v.status]}</span>
        </div>
      </div>
      {v.weiterleitung?.ok && v.weiterleitung.referenz && (
        <p className="mt-4 flex items-center gap-2 text-[14px] text-muted">
          <Icon name="check" className="size-4" /> Per {v.weiterleitung.typ === "fitconnect" ? "FIT-Connect" : v.weiterleitung.typ} übermittelt · Referenz <span className="font-mono">{v.weiterleitung.referenz}</span>
        </p>
      )}
      {v.weiterleitung && !v.weiterleitung.ok && (
        <p className="mt-4 flex items-center gap-2 text-[14px] text-danger">
          <Icon name="alert" className="size-4" /> Die automatische Weiterleitung ({v.weiterleitung.typ}) ist fehlgeschlagen. Der Vorgang liegt vollständig hier vor.
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Block titel="Antragsteller/in">
            <dl className="grid gap-4 text-[15px] sm:grid-cols-3">
              <div>
                <dt className="text-[13px] text-subtle">Name</dt>
                <dd>{d.kontakt.name}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-subtle">E-Mail</dt>
                <dd className="break-all">{d.kontakt.email}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-subtle">Telefon</dt>
                <dd>{d.kontakt.telefon || "–"}</dd>
              </div>
            </dl>
            {d.fuer && (
              <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-[var(--line)] px-4 py-2 text-[14px]">
                <Icon name="users" className="mt-0.5 size-4 shrink-0" />
                {d.fuer}
              </p>
            )}
            {d.nachricht && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{d.nachricht}</p>}
          </Block>

          {v.mangel && (
            <Block titel="Ort des Mangels">
              <p className="text-[15px]">{v.mangel.ort}</p>
              {v.mangel.lat !== undefined && v.mangel.lng !== undefined && (
                <p className="mt-2 text-[14px] text-muted">
                  {v.mangel.lat}, {v.mangel.lng} ·{" "}
                  <a href={`https://www.openstreetmap.org/?mlat=${v.mangel.lat}&mlon=${v.mangel.lng}#map=19/${v.mangel.lat}/${v.mangel.lng}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    In Karte öffnen
                  </a>
                </p>
              )}
            </Block>
          )}

          {d.werte && (
            <Block titel="Angaben im Formular">
              <dl className="grid gap-4 text-[15px] sm:grid-cols-2">
                {felder
                  .filter((f) => d.werte![f.id] !== undefined)
                  .map((f) => (
                    <div key={f.id}>
                      <dt className="text-[13px] text-subtle">{tx(f.label, "de")}</dt>
                      {/* Sensible Felder (IBAN) sind auch hier maskiert */}
                      <dd className="break-words">{anzeigeWert(f, d.werte![f.id], "de")}</dd>
                    </div>
                  ))}
              </dl>
            </Block>
          )}

          {v.dokumente.length > 0 && (
            <Block titel={`Unterlagen (${v.dokumente.length})`}>
              <ul className="space-y-2">
                {v.dokumente.map((dok) => (
                  <li key={dok.id} className="flex items-center justify-between gap-4 rounded-[16px] bg-[var(--line)] px-4 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{decryptJson<string>(dok.name)}</p>
                      <p className="text-[12px] text-subtle">
                        {artLabel(tenant, dok.art, "de")} · {formatGroesse(dok.groesse)}
                        {dok.seiten ? ` · ${dok.seiten} S.` : ""}
                      </p>
                    </div>
                    <a href={links[dok.id]} target="_blank" rel="noopener noreferrer" className="pressable shrink-0 rounded-full px-4 py-2 text-[14px] text-accent">
                      Ansehen
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] text-subtle">Links sind 5 Minuten gültig. Jeder Abruf wird protokolliert. Laden Sie die Seite neu, um neue Links zu erhalten.</p>
            </Block>
          )}

          {nachrichten(v).length > 0 && (
            <Block titel="Nachrichten">
              <ul className="space-y-4">
                {nachrichten(v).map((n, i) => (
                  <li key={i}>
                    <p className="text-[12px] text-subtle">
                      {n.von === "amt" ? `Amt (${n.benutzer ?? "–"})` : "Bürger/in"} · {fmt.format(new Date(n.am))}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[15px]">{n.text}</p>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>

        <div className="space-y-4">
          <Block titel="Bearbeitung">
            <VorgangAktionen
              id={v.id}
              status={v.status}
              statusOptionen={VORGANG_STATUS.map((s) => ({ wert: s, label: STATUS_LABEL[s] }))}
              benutzer={benutzerListe()
                .filter((x) => (x.gemeinde === "*" || x.gemeinde === tenant.slug) && darfAmt(x, v.amtId))
                .map((x) => ({ name: x.name, label: abwesend.has(x.name) ? `${x.name} (abwesend, Vertretung: ${abwesend.get(x.name)})` : x.name }))}
              zugewiesen={v.zugewiesen}
              textbausteine={tenant.textbausteine ?? []}
              zahlungMoeglich={aktiv(tenant, "zahlung")}
              hatAntwort={nachrichten(v).at(-1)?.von === "buerger"}
              entwurfMoeglich={aktiv(tenant, "kiEntwurf")}
            />
          </Block>
          {v.status !== "erledigt" && (
            <Block titel="Frist & Wiedervorlage">
              <Wiedervorlage
                id={v.id}
                am={v.wiedervorlage?.am}
                notiz={v.wiedervorlage?.notiz ? decryptJson<string>(v.wiedervorlage.notiz) : undefined}
                frist={fl ? { datum: fl.frist, ueberfaellig: fl.ueberfaellig, text: fl.ueberfaellig ? `seit ${-fl.rest} Werktag${fl.rest === -1 ? "" : "en"} überschritten` : fl.rest === 0 ? "endet heute" : `noch ${fl.rest} Werktag${fl.rest === 1 ? "" : "e"}` } : undefined}
              />
            </Block>
          )}
          {(post.length > 0 || zahlungen.length > 0) && (
            <Block titel="Zustellungen & Zahlungen">
              <ul className="space-y-2 text-[14px]">
                {post.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4">
                    <span>{p.titel}</span>
                    <span className="shrink-0 text-subtle">{p.gelesenAm ? `gelesen ${fmt.format(new Date(p.gelesenAm))}` : "ungelesen"}</span>
                  </li>
                ))}
                {zahlungen.map((z) => (
                  <li key={z.id} className="flex justify-between gap-4">
                    <span>
                      {euro(z.betragCent)} · {z.zweck.split(" – ")[0]}
                    </span>
                    <span className={`shrink-0 ${z.status === "bezahlt" ? "text-success" : "text-subtle"}`}>{z.status === "bezahlt" ? "bezahlt" : "offen"}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          <Block titel="Verlauf">
            <ol className="space-y-2 text-[14px]">
              {v.verlauf.map((s, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{STATUS_LABEL[s.status]}</span>
                  <span className="text-subtle">
                    {fmt.format(new Date(s.am))}
                    {s.benutzer ? ` · ${s.benutzer}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Block>
          <Block titel="Protokoll (Audit-Log)">
            <ol className="space-y-2 text-[13px]">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-4">
                  <span>
                    {AKTION[a.aktion] ?? a.aktion}
                    {a.details ? ` (${STATUS_LABEL[a.details as keyof typeof STATUS_LABEL] ?? a.details})` : ""}
                  </span>
                  <span className="shrink-0 text-subtle">
                    {a.benutzer} · {fmt.format(new Date(a.erstelltAm))}
                  </span>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </div>
    </div>
  );
}
