import type { Metadata } from "next";
import { getDb } from "@/db";
import { listSets } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../action-form";
import { importSetAction } from "../actions";
import { AdminTitle, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Edice z TCGdex" };
// import velké edice trvá desítky vteřin
export const maxDuration = 300;

export default async function EdiceAdmin() {
  await requireAdmin();
  const sets = await listSets(await getDb());
  return (
    <>
      <AdminTitle>Edice z TCGdex</AdminTitle>
      <ActionForm action={importSetAction} className="pl-panel flex flex-wrap items-end gap-3">
        <div className="pl-field min-w-[220px] flex-1">
          <label htmlFor="setId" className="pl-field__label">
            ID edice v TCGdex
          </label>
          <input id="setId" name="setId" required placeholder="např. sv03.5, sv08, swsh9" className="pl-field__input" />
          <span className="pl-field__hint">
            Seznam ID najdeš na{" "}
            <a href="https://tcgdex.dev" target="_blank" rel="noreferrer">
              tcgdex.dev
            </a>
            . Import stáhne všechny karty edice a jejich dnešní ceny, u velké edice to trvá i minutu.
          </span>
        </div>
        <button type="submit" className="pl-btn pl-btn--primary pl-btn--sm">
          Importovat
        </button>
      </ActionForm>
      <div className="pl-panel overflow-x-auto p-0">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Edice</th>
              <th>ID</th>
              <th>Série</th>
              <th className="num">Karet v katalogu</th>
              <th className="num">Vydáno</th>
              <th className="num">Aktualizováno</th>
            </tr>
          </thead>
          <tbody>
            {sets.map(({ set, cards }) => (
              <tr key={set.id}>
                <td>
                  <strong>{set.name}</strong> {set.code && <span style={{ color: "var(--ink-muted)" }}>{set.code}</span>}
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{set.id}</td>
                <td>{set.series}</td>
                <td className="num">
                  {cards}
                  {set.cardCount ? ` / ${set.cardCount}` : ""}
                </td>
                <td className="num">{set.releaseDate ?? "–"}</td>
                <td className="num">{fmtDate(set.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
