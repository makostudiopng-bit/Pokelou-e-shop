import type { Metadata } from "next";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { discountLabel, listCodes } from "@/lib/discounts";
import { formatCzk } from "@/lib/pricing";
import { ActionForm } from "../action-form";
import { createCodeAction, toggleCodeAction } from "../actions";
import { AdminTitle, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Slevové kódy" };

function state(c: Awaited<ReturnType<typeof listCodes>>[number], now: Date) {
  if (!c.active) return ["vypnutý", "bad"] as const;
  if (c.validUntil && c.validUntil <= now) return ["vypršel", "bad"] as const;
  if (c.maxUses != null && c.usedCount >= c.maxUses) return ["vyčerpaný", "bad"] as const;
  if (c.validFrom && c.validFrom > now) return ["čeká na začátek", "todo"] as const;
  return ["platí", "ok"] as const;
}

export default async function SlevyAdmin() {
  await requireAdmin();
  const codes = await listCodes(await getDb());
  const now = new Date();
  return (
    <>
      <AdminTitle>Slevové kódy</AdminTitle>

      <ActionForm action={createCodeAction} className="pl-panel grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="m-0 text-xl font-extrabold sm:col-span-2 lg:col-span-4">Nový kód</h2>
        <div className="pl-field">
          <label htmlFor="code" className="pl-field__label">
            Kód
          </label>
          <input id="code" name="code" required placeholder="např. JARO10" className="pl-field__input uppercase" autoComplete="off" />
        </div>
        <div className="pl-field">
          <label htmlFor="kind" className="pl-field__label">
            Typ slevy
          </label>
          <select id="kind" name="kind" className="pl-select">
            <option value="percent">Procenta z ceny karet</option>
            <option value="fixed">Pevná částka v Kč</option>
          </select>
        </div>
        <div className="pl-field">
          <label htmlFor="value" className="pl-field__label">
            Výše slevy (% nebo Kč)
          </label>
          <input id="value" name="value" required inputMode="numeric" placeholder="10" className="pl-field__input" />
        </div>
        <div className="pl-field">
          <label htmlFor="minOrder" className="pl-field__label">
            Min. nákup karet (Kč, nepovinné)
          </label>
          <input id="minOrder" name="minOrder" inputMode="numeric" placeholder="1 000" className="pl-field__input" />
        </div>
        <div className="pl-field">
          <label htmlFor="validFrom" className="pl-field__label">
            Platí od (nepovinné)
          </label>
          <input id="validFrom" name="validFrom" type="date" className="pl-field__input" />
        </div>
        <div className="pl-field">
          <label htmlFor="validUntil" className="pl-field__label">
            Platí do včetně (nepovinné)
          </label>
          <input id="validUntil" name="validUntil" type="date" className="pl-field__input" />
        </div>
        <div className="pl-field">
          <label htmlFor="maxUses" className="pl-field__label">
            Max. počet použití (nepovinné)
          </label>
          <input id="maxUses" name="maxUses" inputMode="numeric" placeholder="bez omezení" className="pl-field__input" />
        </div>
        <div className="pl-field">
          <label htmlFor="note" className="pl-field__label">
            Interní poznámka
          </label>
          <input id="note" name="note" placeholder="např. Instagram soutěž" className="pl-field__input" />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="pl-btn pl-btn--primary pl-btn--sm">
            Vytvořit kód
          </button>
          <span className="pl-note">Sleva se počítá jen z ceny karet, doprava se nezlevňuje. Zrušená objednávka použití kódu vrátí.</span>
        </div>
      </ActionForm>

      <div className="pl-panel overflow-x-auto p-0">
        {codes.length === 0 ? (
          <p className="pl-note m-0 p-5">Zatím žádné slevové kódy.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Kód</th>
                <th>Sleva</th>
                <th>Podmínky</th>
                <th className="num">Použito</th>
                <th>Stav</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const [label, tone] = state(c, now);
                return (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>{c.code}</strong>
                      {c.note && (
                        <>
                          <br />
                          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                            {c.note}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{discountLabel(c)}</td>
                    <td className="text-[13px]">
                      {[
                        c.minOrderHal ? `od ${formatCzk(c.minOrderHal)}` : null,
                        c.validFrom ? `od ${fmtDate(c.validFrom)}` : null,
                        c.validUntil ? `do ${fmtDate(new Date(c.validUntil.getTime() - 1))}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "–"}
                    </td>
                    <td className="num">
                      {c.usedCount}
                      {c.maxUses != null && ` / ${c.maxUses}`}
                    </td>
                    <td>
                      <span className={`pl-status pl-status--${tone}`}>{label}</span>
                    </td>
                    <td>
                      <ActionForm action={toggleCodeAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={c.active ? "0" : "1"} />
                        <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
                          {c.active ? "Vypnout" : "Zapnout"}
                        </button>
                      </ActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
