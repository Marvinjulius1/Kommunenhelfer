import type { Metadata } from "next";
import Link from "next/link";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Leichte Sprache" };

/**
 * Erläuterungen in Leichter Sprache (Pflicht nach § 4 BITV 2.0):
 * Was steht auf der Seite? Wie benutzt man sie? Was steht in der Erklärung zur Barrierefreiheit?
 * Kurze Sätze, ein Gedanke pro Satz, lange Wörter mit Bindestrich, große Schrift.
 */
function Abschnitt({ icon, titel, children }: { icon: IconName; titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="flex items-center gap-3 text-[24px] font-semibold">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--line)]" aria-hidden="true">
          <Icon name={icon} className="size-5" />
        </span>
        {titel}
      </h2>
      <div className="mt-4 space-y-4 text-[19px] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function LeichteSprache() {
  const tenant = await getTenant();
  const k = tenant.kontakt;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6" lang="de">
      <h1 className="text-[36px] font-semibold tracking-[-0.02em] sm:text-[44px]">Leichte Sprache</h1>
      <p className="mt-4 text-[20px] leading-relaxed">
        Hier erklären wir diese Internet-Seite.
        <br />
        In Leichter Sprache.
      </p>

      <div className="mt-10">
        <Abschnitt icon="home" titel="Was ist das für eine Seite?">
          <p>
            Das ist die Internet-Seite von der {tenant.art} {tenant.name}.
          </p>
          <p>Hier können Sie Sachen mit dem Amt erledigen.</p>
          <p>Sie müssen dafür nicht ins Rathaus gehen.</p>
          <p>Zum Beispiel:</p>
          <ul className="list-disc space-y-2 ps-6">
            <li>einen Termin im Rathaus machen</li>
            <li>einen Antrag stellen</li>
            {aktiv(tenant, "abfall") && tenant.abfall && <li>nach-sehen: Wann kommt die Müll-Abfuhr?</li>}
            {aktiv(tenant, "maengelmelder") && tenant.maengel && <li>sagen: Hier ist etwas kaputt.</li>}
          </ul>
        </Abschnitt>

        <Abschnitt icon="search" titel="So benutzen Sie die Seite">
          <p>Auf der ersten Seite ist ein großes Feld.</p>
          <p>Schreiben Sie dort hinein: Was möchten Sie?</p>
          <p>Zum Beispiel: Ich will meinen Hund anmelden.</p>
          <p>Dann drücken Sie auf den Pfeil.</p>
          <p>Der Computer zeigt Ihnen dann: Das müssen Sie machen.</p>
          <p className="rounded-[20px] bg-[var(--line)] p-5">
            Wichtig: Der Computer gibt nur Hinweise.
            <br />
            Er entscheidet nichts.
            <br />
            Das macht immer ein Mensch im Amt.
          </p>
          <p>Unten auf jeder Seite können Sie die Sprache wählen.</p>
          <p>
            Wählen Sie dort <strong>Leichte Sprache</strong>.
            <br />
            Dann sehen Sie manche Texte in Leichter Sprache.
          </p>
        </Abschnitt>

        <Abschnitt icon="user" titel="Ein eigenes Konto">
          <p>Sie können sich ein Konto machen.</p>
          <p>Ein Konto ist wie ein eigener Brief-Kasten beim Amt.</p>
          <p>Dann sehen Sie alle Ihre Sachen an einem Ort.</p>
          <p>Und Sie müssen Ihren Namen nicht immer neu schreiben.</p>
          <p>
            <Link href="/konto/anmelden" className="font-medium text-accent underline underline-offset-4">
              Hier können Sie ein Konto machen.
            </Link>
          </p>
        </Abschnitt>

        <Abschnitt icon="lock" titel="Ihre Daten sind sicher">
          <p>Sie schreiben Ihre Daten auf dieser Seite.</p>
          <p>Zum Beispiel Ihren Namen.</p>
          <p>Wir passen gut auf Ihre Daten auf.</p>
          <p>Wir geben Ihre Daten nicht an fremde Firmen.</p>
        </Abschnitt>

        <Abschnitt icon="check" titel="Barriere-Freiheit">
          <p>Barriere-frei heißt:</p>
          <p>Alle Menschen sollen die Seite gut benutzen können.</p>
          <p>Auch Menschen mit Behinderung.</p>
          <p>Zum Beispiel Menschen, die nicht gut sehen können.</p>
          <p>Wir geben uns große Mühe.</p>
          <p>Aber vielleicht ist noch nicht alles gut.</p>
          <p>Dann sagen Sie es uns bitte.</p>
          <p>
            <Link href="/barrierefreiheit" className="font-medium text-accent underline underline-offset-4">
              Hier steht mehr dazu. In schwerer Sprache.
            </Link>
          </p>
        </Abschnitt>

        <Abschnitt icon="phone" titel="So erreichen Sie uns">
          <Glass className="rounded-[24px] p-6 text-[19px] leading-relaxed">
            <p className="font-semibold">{tx(k.bezeichnung, "de")}</p>
            <p>{k.strasse}</p>
            <p>
              {k.plz} {k.ort}
            </p>
            {k.telefon && (
              <p className="mt-3">
                Telefon:{" "}
                <a href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`} className="font-medium text-accent underline underline-offset-4">
                  {k.telefon}
                </a>
              </p>
            )}
            {k.email && (
              <p>
                E-Mail:{" "}
                <a href={`mailto:${k.email}`} className="font-medium text-accent underline underline-offset-4">
                  {k.email}
                </a>
              </p>
            )}
          </Glass>
          <p>Sie können auch einen Termin machen.</p>
          <p>Dann haben wir Zeit für Sie.</p>
          <p>
            <Link href="/termine" className="font-medium text-accent underline underline-offset-4">
              Hier können Sie einen Termin machen.
            </Link>
          </p>
        </Abschnitt>
      </div>
    </div>
  );
}
