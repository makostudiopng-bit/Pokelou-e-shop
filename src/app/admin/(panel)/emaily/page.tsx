// Administrace › E-maily: nastavení, náhledy všech e-mailů a záznam odeslaných.
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { recentEmails, shopInbox } from "@/lib/email/notify";
import { inlineAttachments, isPreviewKey, PREVIEWS, renderPreview } from "@/lib/email/previews";
import { DEFAULT_FROM, emailConfigured } from "@/lib/email/send";
import { latestRate } from "@/lib/buyback";
import { siteUrl } from "@/lib/site-url";
import { ActionForm } from "../action-form";
import { testEmailAction } from "../actions";
import { AdminTitle, fmtDate } from "../ui";

export const metadata: Metadata = { title: "E-maily" };

const STATUS: Record<string, [string, string]> = { sent: ["odesláno", "ok"], failed: ["chyba", "bad"], skipped: ["neodesláno", "todo"] };

export default async function EmailyAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const key = isPreviewKey(sp.nahled) ? sp.nahled : "order_created";
  const lang = sp.jazyk === "en" ? "en" : "cs";
  const db = await getDb();
  const [log, rate] = await Promise.all([recentEmails(db), latestRate(db)]);
  const preview = await renderPreview(key, lang, siteUrl(), rate);
  const configured = emailConfigured();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const href = (k: string, l: string) => `/admin/emaily?nahled=${k}&jazyk=${l}`;

  return (
    <>
      <AdminTitle>E-maily</AdminTitle>

      <section className="pl-panel flex flex-col gap-3">
        <h2 className="m-0 text-xl font-extrabold">Nastavení</h2>
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[15px]">
          <dt style={{ color: "var(--ink-muted)" }}>Odesílání (Resend)</dt>
          <dd className="m-0 font-bold">
            {configured ? <span className="pl-status pl-status--ok">zapnuté</span> : <span className="pl-status pl-status--bad">vypnuté, chybí RESEND_API_KEY</span>}
          </dd>
          <dt style={{ color: "var(--ink-muted)" }}>Odesílatel</dt>
          <dd className="m-0 break-all">
            {from}
            {from === DEFAULT_FROM && <span className="pl-note block">Testovací adresa Resendu doručí jen na e-mail majitele účtu. Pro zákazníky je potřeba ověřit doménu a nastavit EMAIL_FROM.</span>}
          </dd>
          <dt style={{ color: "var(--ink-muted)" }}>Upozornění pro obchod</dt>
          <dd className="m-0 break-all">{shopInbox()}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>Odkazy v e-mailech</dt>
          <dd className="m-0 break-all">{siteUrl()}</dd>
        </dl>
        <ActionForm action={testEmailAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="nahled" value={key} />
          <input type="hidden" name="jazyk" value={lang} />
          <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
            Poslat ukázku „{PREVIEWS[key]}“ na {shopInbox()}
          </button>
        </ActionForm>
      </section>

      <section className="pl-panel flex flex-col gap-4">
        <h2 className="m-0 text-xl font-extrabold">Náhledy</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PREVIEWS).map(([k, label]) => (
            <Link key={k} href={href(k, lang)} aria-current={k === key ? "page" : undefined} className={`pl-btn pl-btn--sm ${k === key ? "pl-btn--primary" : "pl-btn--secondary"}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span style={{ color: "var(--ink-muted)" }}>Jazyk:</span>
          <Link href={href(key, "cs")} className={lang === "cs" ? "font-extrabold" : ""}>čeština</Link>
          <Link href={href(key, "en")} className={lang === "en" ? "font-extrabold" : ""}>angličtina</Link>
          <span style={{ color: "var(--ink-muted)" }}>· Předmět: <strong style={{ color: "var(--ink)" }}>{preview.subject}</strong></span>
        </div>
        <iframe title={`Náhled: ${PREVIEWS[key]}`} srcDoc={inlineAttachments(preview)} sandbox="" className="h-[900px] w-full rounded-xl" style={{ border: "2px solid var(--line)", background: "#f4eee6" }} />
        <p className="pl-note m-0">Ukázková data, ne skutečná objednávka. Zákazník dostane e-mail v jazyce, ve kterém web používal.</p>
      </section>

      <section className="pl-panel flex flex-col gap-3">
        <h2 className="m-0 text-xl font-extrabold">Posledních 100 e-mailů</h2>
        {log.length === 0 ? (
          <p className="m-0">Zatím žádné.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Kdy</th>
                  <th>Komu</th>
                  <th>Předmět</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {log.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="break-all">{m.to}</td>
                    <td>{m.subject}</td>
                    <td>
                      <span className={`pl-status pl-status--${STATUS[m.status][1]}`} title={m.error ?? undefined}>
                        {STATUS[m.status][0]}
                      </span>
                      {m.error && m.status !== "sent" && <span className="pl-note block">{m.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
