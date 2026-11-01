"use client";
// Filtr edic s vyhledáváním: edic bude časem hodně, tak jdou zúžit psaním.
// Vyhledávací pole nemá name, takže se do adresy neposílá; zaškrtnuté edice zůstávají vidět vždy.
import { useState } from "react";
import { norm } from "@/lib/catalog-query";

const SEARCH_FROM = 6; // pole ukázat, až je edic víc
const COLLAPSED = 8; // bez hledání ukázat jen prvních pár

export function SetFilter({ sets, selected }: { sets: [string, number][]; selected: string[] }) {
  const [term, setTerm] = useState("");
  const [all, setAll] = useState(false);
  const isOn = (s: string) => selected.some((x) => x.toLowerCase() === s.toLowerCase());
  const t = norm(term.trim());
  const matches = sets.filter(([s]) => !t || norm(s).includes(t));
  const visible = t || all ? matches : sets.filter(([s], i) => i < COLLAPSED || isOn(s));
  const hiddenCount = sets.length - visible.length;

  return (
    <fieldset className="pl-fs">
      <legend>Edice</legend>
      {sets.length > SEARCH_FROM && (
        <label className="pl-field">
          <span className="sr-only">Hledat edici</span>
          <input
            type="search"
            className="pl-field__input w-full"
            placeholder="Hledat edici…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            // Enter tu nemá odeslat filtry
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            autoComplete="off"
          />
        </label>
      )}
      {sets.map(([s, n]) => (
        // nevyhovující edice jen schované (ne odebrané), aby se zaškrtnuté hodnoty odeslaly vždy
        <label key={s} className="pl-check" hidden={!visible.some(([v]) => v === s)}>
          <input type="checkbox" name="edice" value={s} defaultChecked={isOn(s)} />
          {s}
          <span className="pl-check__n">{n}</span>
        </label>
      ))}
      {t && matches.length === 0 && <span className="pl-note">Žádná edice neodpovídá.</span>}
      {!t && hiddenCount > 0 && (
        <button type="button" className="pl-linkbtn" onClick={() => setAll(true)}>
          Zobrazit všechny edice ({sets.length})
        </button>
      )}
      {!t && all && sets.length > COLLAPSED && (
        <button type="button" className="pl-linkbtn" onClick={() => setAll(false)}>
          Zobrazit méně
        </button>
      )}
    </fieldset>
  );
}
