export default function Offline() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Keine Verbindung</h1>
      <p className="mt-3 text-[17px] text-muted">Sie sind gerade offline. Sobald die Verbindung wieder besteht, können Sie weitermachen.</p>
    </div>
  );
}
