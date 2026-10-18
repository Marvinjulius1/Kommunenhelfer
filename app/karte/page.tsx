import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stadtkarte, type Ebene, type Punkt } from "@/components/karte/Stadtkarte";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { oeffentlicheMaengel } from "@/lib/maengel/service";
import { aktuelleMeldungen } from "@/lib/meldungen/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Stadtkarte" };
export const dynamic = "force-dynamic";

const EBENEN: Ebene[] = [
  { id: "rathaus", label: "Rathaus & Ämter", farbe: "#2a78d6", icon: "home" },
  { id: "meldung", label: "Baustellen & Sperrungen", farbe: "#eb6834", icon: "alert" },
  { id: "defibrillator", label: "Defibrillatoren", farbe: "#c4373a", icon: "heart" },
  { id: "kita", label: "Kitas", farbe: "#7a4fc4", icon: "users" },
  { id: "spielplatz", label: "Spielplätze", farbe: "#2f8f5b", icon: "leaf" },
  { id: "parken", label: "Parken & Laden", farbe: "#138a8a", icon: "pin" },
  { id: "wertstoffhof", label: "Wertstoffhof", farbe: "#8a5a2b", icon: "refresh" },
  { id: "toilette", label: "Toiletten", farbe: "#5b6470", icon: "info" },
  { id: "freizeit", label: "Bad & Bücherei", farbe: "#c2407e", icon: "sun" },
  { id: "friedhof", label: "Friedhöfe", farbe: "#6b7280", icon: "leaf" },
  { id: "mangel", label: "Gemeldete Mängel", farbe: "#7b8a1f", icon: "pin" },
];

const EBENE_VON: Record<string, string> = { rathaus: "rathaus", wertstoffhof: "wertstoffhof", defibrillator: "defibrillator", toilette: "toilette", spielplatz: "spielplatz", parken: "parken", ladesaeule: "parken", bad: "freizeit", bibliothek: "freizeit", sonstiges: "rathaus" };

export default async function KarteSeite({ searchParams }: { searchParams: Promise<{ zeige?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "karte") || !tenant.karte) notFound();
  const punkte: Punkt[] = [
    ...(tenant.orte ?? []).map((o) => ({ id: `ort-${o.id}`, name: o.name, ebene: EBENE_VON[o.kategorie], lat: o.lat, lng: o.lng, text: [o.adresse, o.hinweis].filter(Boolean).join(" · ") || undefined })),
    ...(aktiv(tenant, "kita") ? (tenant.kitas ?? []).filter((k) => k.lat !== undefined && k.lng !== undefined).map((k) => ({ id: `kita-${k.id}`, name: k.name, ebene: "kita", lat: k.lat!, lng: k.lng!, text: `${k.adresse} · ${k.oeffnungszeiten ?? ""}`, href: "/kita" })) : []),
    ...(aktiv(tenant, "friedhof") ? (tenant.friedhoefe ?? []).filter((f) => f.lat !== undefined && f.lng !== undefined).map((f) => ({ id: `fh-${f.id}`, name: f.name, ebene: "friedhof", lat: f.lat!, lng: f.lng!, text: f.oeffnungszeiten, href: "/friedhof" })) : []),
    ...(await aktuelleMeldungen(tenant)).filter((m) => m.lat !== undefined && m.lng !== undefined).map((m) => ({ id: `m-${m.id}`, name: m.titel, ebene: "meldung", lat: m.lat!, lng: m.lng!, text: m.text.slice(0, 160), href: "/aktuelles" })),
    ...(aktiv(tenant, "maengelmelder") ? (await oeffentlicheMaengel(tenant)).filter((m) => m.lat !== undefined && m.lng !== undefined && m.status !== "erledigt").map((m) => ({ id: `mg-${m.id}`, name: m.kategorieLabel, ebene: "mangel", lat: m.lat!, lng: m.lng!, text: `${m.ort} · ${m.statusLabel}`, href: "/maengel" })) : []),
  ];
  const ebenen = EBENEN.filter((e) => punkte.some((p) => p.ebene === e.id));
  const zeige = (await searchParams).zeige;
  return (
    <Page titel="Stadtkarte" intro="Wertstoffhof, Defibrillatoren, Toiletten, Spielplätze, Baustellen und mehr – auf einen Blick." breit>
      <Stadtkarte mitte={tenant.karte.mitte} zoom={tenant.karte.zoom} punkte={punkte} ebenen={ebenen} start={zeige && ebenen.some((e) => e.id === zeige) ? [zeige] : undefined} />
      <p className="mt-6 text-[13px] text-subtle">Die Karte wird über die Server der Stadt geladen – Ihre IP-Adresse geht dabei nicht an Dritte.</p>
    </Page>
  );
}
