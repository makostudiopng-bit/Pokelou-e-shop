// Veřejná adresa webu pro odkazy v e-mailech (e-mail nezná „aktuální“ doménu).
// SITE_URL nastav po připojení vlastní domény; do té doby se použije produkční adresa z Vercelu.
export function siteUrl() {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
