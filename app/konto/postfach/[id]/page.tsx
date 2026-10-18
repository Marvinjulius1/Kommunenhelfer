import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/components/ui/Markdown";
import { kontoFuer } from "@/lib/konto/vertretung";
import { alsGelesen, postSicht } from "@/lib/postfach/service";
import type { PostfachRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";
import { getTenant } from "@/lib/tenant";
import { formatGroesse } from "@/lib/uploads/formate";

export const metadata: Metadata = { title: "Postfach" };
export const dynamic = "force-dynamic";

export default async function PostEintrag({ params }: { params: Promise<{ id: string }> }) {
  const k = await kontoFuer(await getTenant(), "post");
  if (!k) redirect("/konto/anmelden?weiter=/konto/postfach");
  const r = await store().get<PostfachRecord>("postfach", (await params).id);
  if (!r || r.kontoId !== k.id) notFound();
  await alsGelesen(r);
  const p = postSicht(r);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <Link href="/konto/postfach" className="inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
        <Icon name="chevronLeft" className="size-4" /> Postfach
      </Link>
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em]">{p.titel}</h1>
      <p className="mt-2 text-[14px] text-subtle">
        {p.absender} · {new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(p.erstelltAm))}
        {p.vorgangId && ` · Vorgang ${p.vorgangId}`}
      </p>
      <Glass className="mt-8 rounded-[24px] p-6">
        <Markdown text={p.text} className="text-[16px] leading-relaxed" />
        {p.dokument && (
          <a href={`/api/postfach/${p.id}?datei=1`} target="_blank" rel="noopener" className="mt-6 flex items-center gap-4 rounded-[16px] bg-[var(--line)] p-4">
            <Icon name="doc" className="size-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{p.dokument.name}</span>
              <span className="text-[13px] text-subtle">{formatGroesse(p.dokument.groesse)} · öffnen</span>
            </span>
            <Icon name="external" className="size-4 text-subtle" />
          </a>
        )}
      </Glass>
      <p className="mt-4 text-[13px] text-subtle">Zugestellt in Ihr Bürgerkonto. Mit dem ersten Öffnen gilt das Dokument als zugegangen.</p>
    </div>
  );
}
