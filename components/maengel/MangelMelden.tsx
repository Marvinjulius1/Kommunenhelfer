"use client";

/**
 * Mangel melden: Kategorie, Foto, Standort, kurze Beschreibung.
 * Der Standort wird nur auf Knopfdruck abgefragt. Fotos werden auf dem
 * Server von GPS- und Gerätedaten befreit.
 */
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { speichereAnliegen } from "@/lib/client/anliegen";
import { uploadFehlertext } from "@/lib/client/uploads";
import { tx } from "@/lib/i18n";
import { einblenden } from "@/lib/motion";

type Ergebnis = { vorgangsnummer: string; zugangscode: string; amt: string };

export function MangelMelden() {
  const { tenant, lang, konto } = useTenant();
  const de = lang === "de";
  const kategorien = tenant.maengel!.kategorien;
  const [kategorie, setKategorie] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [ort, setOrt] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number; genau: number } | null>(null);
  const [ortStatus, setOrtStatus] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [naehe, setNaehe] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  useEffect(() => () => void (vorschau && URL.revokeObjectURL(vorschau)), [vorschau]);

  // Doppelmeldungen vermeiden: gibt es in der Nähe schon eine offene Meldung?
  useEffect(() => {
    if (!pos || !kategorie) return setNaehe(0);
    const c = new AbortController();
    fetch(`/api/maengel?kategorie=${encodeURIComponent(kategorie)}&lat=${pos.lat}&lng=${pos.lng}`, { signal: c.signal })
      .then((r) => r.json())
      .then((d) => setNaehe(d.anzahl ?? 0))
      .catch(() => undefined);
    return () => c.abort();
  }, [pos, kategorie]);

  const standort = () => {
    if (!("geolocation" in navigator)) return setOrtStatus(de ? "Ihr Gerät kann den Standort nicht ermitteln." : "Location is not available.");
    setOrtStatus(de ? "Standort wird ermittelt …" : "Locating …");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = Math.round(p.coords.latitude * 1e5) / 1e5;
        const lng = Math.round(p.coords.longitude * 1e5) / 1e5;
        setPos({ lat, lng, genau: Math.round(p.coords.accuracy) });
        setOrtStatus(de ? `Standort übernommen (Genauigkeit ca. ${Math.round(p.coords.accuracy)} m).` : `Location added (accuracy approx. ${Math.round(p.coords.accuracy)} m).`);
        if (!ort) setOrt(de ? "Am markierten Standort" : "At the marked location");
      },
      () => setOrtStatus(de ? "Standort nicht verfügbar. Bitte beschreiben Sie den Ort." : "Location unavailable. Please describe the place."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const fotoWaehlen = (f: File | undefined) => {
    setFehler(null);
    if (!f) return;
    if (!/^image\/(jpeg|png)$/.test(f.type)) return setFehler(de ? "Bitte ein Foto im Format JPG oder PNG verwenden." : "Please use a JPG or PNG photo.");
    if (f.size > tenant.uploads.maxDateiMB * 1024 * 1024) return setFehler(uploadFehlertext("zu_gross", tenant, lang));
    if (vorschau) URL.revokeObjectURL(vorschau);
    setFoto(f);
    setVorschau(URL.createObjectURL(f));
  };

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler(null);
    if (!kategorie) return setFehler(de ? "Bitte wählen Sie, worum es geht." : "Please choose a category.");
    setSendet(true);
    const fd = new FormData();
    fd.set("kategorie", kategorie);
    fd.set("beschreibung", beschreibung);
    fd.set("ort", ort);
    if (pos) {
      fd.set("lat", String(pos.lat));
      fd.set("lng", String(pos.lng));
    }
    if (!konto) {
      fd.set("name", name);
      fd.set("email", email);
    }
    fd.set("einwilligung", ok ? "1" : "0");
    if (foto) fd.set("foto", foto);
    const res = await fetch("/api/maengel", { method: "POST", body: fd }).catch(() => null);
    setSendet(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setFehler(res?.status === 429 ? uploadFehlertext("zu_viele_anfragen", tenant, lang) : d?.fehler && d.fehler !== "ungueltige_anfrage" ? uploadFehlertext(d.fehler, tenant, lang) : de ? "Bitte prüfen Sie Ihre Angaben." : "Please check your entries.");
      return;
    }
    const kat = kategorien.find((k) => k.id === kategorie)!;
    if (!konto) speichereAnliegen({ id: d.vorgangsnummer, code: d.zugangscode, typ: "antrag", titel: `${de ? "Mängelmeldung" : "Report"}: ${tx(kat.label, lang)}`, erstelltAm: new Date().toISOString() });
    setErgebnis(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (ergebnis)
    return (
      <motion.div initial="hidden" animate="show" variants={einblenden}>
        <Glass className="rounded-[32px] p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-on-accent">
            <Icon name="check" className="size-6" />
          </span>
          <h2 className="mt-5 text-[22px] font-semibold tracking-tight">{de ? "Vielen Dank für Ihre Meldung." : "Thank you for your report."}</h2>
          <p className="mt-2 text-[15px] text-muted">
            {de ? `Sie ist beim ${ergebnis.amt} eingegangen.` : `It has been sent to: ${ergebnis.amt}.`} {de ? "Vorgangsnummer" : "Reference"}: <span className="font-mono">{ergebnis.vorgangsnummer}</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/meine-anliegen" variant="glass">
              {de ? "Stand verfolgen" : "Track status"}
            </ButtonLink>
            <ButtonLink href="/maengel">{de ? "Alle Meldungen" : "All reports"}</ButtonLink>
          </div>
        </Glass>
      </motion.div>
    );

  return (
    <form onSubmit={senden} className="space-y-8" noValidate>
      <fieldset>
        <legend className="text-[17px] font-semibold">{de ? "Worum geht es?" : "What is it about?"}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {kategorien.map((k) => (
            <label key={k.id} className={`choice flex cursor-pointer items-center gap-3 rounded-[18px] px-4 py-4`}>
              <input type="radio" name="kategorie" value={k.id} checked={kategorie === k.id} onChange={() => setKategorie(k.id)} className="radio" />
              <span className="text-[15px]">{tx(k.label, lang)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-[17px] font-semibold">{de ? "Foto (freiwillig)" : "Photo (optional)"}</p>
        <p className="mt-1 text-[13px] text-subtle">{de ? "Standort- und Gerätedaten im Foto entfernen wir automatisch." : "We automatically remove location and device data from the photo."}</p>
        {vorschau ? (
          <div className="mt-3 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau (blob:) */}
            <img src={vorschau} alt={de ? "Vorschau des Fotos" : "Photo preview"} className="h-28 w-auto rounded-[16px] object-cover" />
            <button
              type="button"
              onClick={() => {
                setFoto(null);
                setVorschau(null);
              }}
              className="pressable rounded-full px-4 py-2 text-[14px] text-muted"
            >
              {de ? "Foto entfernen" : "Remove photo"}
            </button>
          </div>
        ) : (
          <label className="glass pressable mt-3 flex cursor-pointer items-center gap-3 rounded-[18px] px-4 py-4 text-[15px]">
            <Icon name="camera" className="size-5 text-muted" />
            {de ? "Foto aufnehmen oder auswählen" : "Take or choose a photo"}
            <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={(e) => fotoWaehlen(e.target.files?.[0])} />
          </label>
        )}
      </div>

      <div>
        <label htmlFor="m-ort" className="text-[17px] font-semibold">
          {de ? "Wo genau?" : "Where exactly?"}
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={standort} className="glass pressable flex items-center gap-2 rounded-full px-4 py-3 text-[15px]">
            <Icon name="pin" className="size-4" />
            {pos ? (de ? "Standort aktualisieren" : "Update location") : de ? "Meinen Standort verwenden" : "Use my location"}
          </button>
        </div>
        <p role="status" className="mt-2 text-[13px] text-subtle">
          {ortStatus}
        </p>
        <input
          id="m-ort"
          className="field-input mt-2"
          value={ort}
          onChange={(e) => setOrt(e.target.value)}
          placeholder={de ? "z. B. Hauptstraße 12, vor der Bäckerei" : "e.g. Hauptstraße 12, in front of the bakery"}
          maxLength={200}
          required
        />
        {naehe > 0 && (
          <p className="mt-2 text-[14px] text-muted">
            {de
              ? `Hier wurde bereits ${naehe === 1 ? "ein ähnlicher Mangel" : `${naehe} ähnliche Mängel`} gemeldet und ist in Bearbeitung. Sie können trotzdem melden, wenn es etwas anderes ist.`
              : `A similar issue has already been reported nearby and is being handled.`}{" "}
            <Link href="/maengel" className="underline underline-offset-4">
              {de ? "Ansehen" : "View"}
            </Link>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="m-text" className="text-[17px] font-semibold">
          {de ? "Was ist los?" : "What is the problem?"}
        </label>
        <textarea id="m-text" className="field-input mt-3" rows={3} maxLength={1000} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} required minLength={5} />
        <p className="mt-1 text-[13px] text-subtle">{de ? "Bitte keine Daten anderer Personen (z. B. Kennzeichen) angeben." : "Please do not include other people's data (e.g. licence plates)."}</p>
      </div>

      {!konto && (
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="text-[13px] text-subtle sm:col-span-2">{de ? "Freiwillig – nur wenn Sie über den Stand informiert werden möchten:" : "Optional – only if you want status updates:"}</p>
          <label className="text-[14px] font-medium">
            {de ? "Name" : "Name"}
            <input className="field-input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
          </label>
          <label className="text-[14px] font-medium">
            {de ? "E-Mail-Adresse" : "Email address"}
            <input className="field-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} />
          </label>
        </div>
      )}

      <label className="flex items-start gap-3 text-[14px] leading-relaxed">
        <input type="checkbox" className="checkbox mt-0.5" checked={ok} onChange={(e) => setOk(e.target.checked)} required />
        <span>
          {de
            ? "Ich bin einverstanden, dass meine Meldung zur Bearbeitung gespeichert wird. Ort, Kategorie und Status erscheinen ohne Beschreibung und Foto in der öffentlichen Liste. "
            : "I agree that my report is stored for processing. Location, category and status appear in the public list without description and photo. "}
          <Link href="/datenschutz#maengel" className="underline underline-offset-4">
            {de ? "Datenschutz" : "Privacy"}
          </Link>
        </span>
      </label>

      {fehler && (
        <p role="alert" className="text-[15px] text-danger">
          {fehler}
        </p>
      )}
      <Button type="submit" disabled={sendet || !ok || !kategorie || beschreibung.trim().length < 5 || ort.trim().length < 3} aria-busy={sendet} className="w-full sm:w-auto sm:px-8">
        {sendet ? (de ? "Wird gesendet …" : "Sending …") : de ? "Mangel melden" : "Send report"}
      </Button>
    </form>
  );
}
