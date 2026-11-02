"use client";
// Přepínač den/noc. Výchozí je podle zařízení; volba se pamatuje v tomhle prohlížeči.
// Ikona se řídí jen CSS podle aktuálního motivu, takže se server a prohlížeč nikdy neliší.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const now = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = now === "dark" ? "light" : "dark";
    root.classList.add("pl-theme-anim");
    root.dataset.theme = next;
    setTimeout(() => root.classList.remove("pl-theme-anim"), 400);
    try {
      localStorage.setItem("pl_theme", next);
    } catch {
      /* soukromé okno: volba platí jen do zavření */
    }
  }
  return (
    <button type="button" onClick={toggle} className="pl-theme pl-lift" aria-label="Přepnout denní a noční verzi" title="Den / noc">
      <svg className="pl-theme__moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg className="pl-theme__sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    </button>
  );
}
