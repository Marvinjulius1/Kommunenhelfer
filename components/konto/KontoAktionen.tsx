"use client";

/** Kleine interaktive Teile des Kontos: Abmelden, Anliegen übernehmen. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { ladeAnliegen } from "@/lib/client/anliegen";

export function AbmeldenKnopf() {
  const router = useRouter();
  return (
    <Button
      variant="glass"
      onClick={async () => {
        await fetch("/api/konto/abmelden", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      Abmelden
    </Button>
  );
}

/** Bietet an, Anliegen, die ohne Konto auf diesem Gerät gestellt wurden, ins Konto zu übernehmen. */
export function AnliegenUebernehmen() {
  const router = useRouter();
  const [anzahl, setAnzahl] = useState(0);
  const [fertig, setFertig] = useState<string | null>(null);
  useEffect(() => {
    // Nur Anliegen anbieten, die noch nicht im Konto sind
    fetch("/api/konto/anliegen")
      .then((r) => r.json())
      .then((d) => {
        const imKonto = new Set((d.eintraege ?? []).map((e: { id: string }) => e.id));
        setAnzahl(ladeAnliegen().filter((a) => !imKonto.has(a.id)).length);
      })
      .catch(() => undefined);
  }, []);
  if (!anzahl && !fertig) return null;
  return (
    <Glass className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-6">
      <p className="text-[15px]">
        {fertig ?? `Auf diesem Gerät ${anzahl === 1 ? "ist 1 Anliegen" : `sind ${anzahl} Anliegen`} ohne Konto gespeichert.`}
      </p>
      {!fertig && (
        <Button
          className="!min-h-10 px-4 text-[14px]"
          onClick={async () => {
            const res = await fetch("/api/konto/uebernehmen", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ eintraege: ladeAnliegen().map(({ id, code }) => ({ id, code })) }),
            });
            const d = await res.json().catch(() => ({}));
            setFertig(res.ok ? `${d.uebernommen ?? 0} Anliegen in Ihr Konto übernommen.` : "Das hat nicht geklappt. Bitte versuchen Sie es erneut.");
            router.refresh();
          }}
        >
          In mein Konto übernehmen
        </Button>
      )}
    </Glass>
  );
}
