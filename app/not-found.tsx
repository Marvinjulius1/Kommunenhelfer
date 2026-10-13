import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Seite nicht gefunden</h1>
      <p className="mt-3 text-[17px] text-muted">Diese Seite gibt es leider nicht (mehr). Beschreiben Sie Ihr Anliegen gern auf der Startseite.</p>
      <div className="mt-8">
        <ButtonLink href="/">Zur Startseite</ButtonLink>
      </div>
    </div>
  );
}
