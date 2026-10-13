/**
 * Setzt das Farbschema VOR dem ersten Zeichnen (kein Aufblitzen).
 * Gespeichert wird nur "light" | "dark" | "system" im localStorage –
 * eine rein technische, einwilligungsfreie Einstellung.
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  const code = `(function(){try{var s=localStorage.getItem('theme')||'system';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePref=s;}catch(e){}})();`;
  return <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />;
}
