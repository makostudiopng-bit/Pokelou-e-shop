"use client";
// Naskladnění: najdi kartu, zvol stav, jazyk a provedení, uprav cenu, potvrď.
// Po uložení zůstane formulář připravený na další kartu (rychlé naskladňování z krabice).
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Condition, Finish } from "@/db/schema";
import { BUYBACK_LANGUAGES, type BuybackCard } from "@/lib/buyback-shared";
import { formatCzk, sellPrice } from "@/lib/pricing";
import { intakeAction, type ActionState } from "../actions";

const CONDITIONS: Condition[] = ["M", "NM", "EX", "GD", "LP", "PL", "PO"];

const FINISH_OPTIONS: [Finish, string][] = [
  ["normal", "Běžné"],
  ["holo", "Holo"],
  ["reverse_holo", "Reverse"],
  ["first_edition", "1st Ed."],
];

function Pills<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onPick(v)}
            className="h-9 min-w-11 cursor-pointer rounded-md px-2.5 text-[13px] font-bold"
            style={value === v ? { background: "var(--surface-inverse)", color: "var(--ink-inverse)", border: "1.5px solid var(--surface-inverse)" } : { background: "var(--surface-100)", border: "1.5px solid var(--line-strong)" }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function IntakeForm() {
  const [state, action, pending] = useActionState(intakeAction, {} as ActionState);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BuybackCard[]>([]);
  const [card, setCard] = useState<BuybackCard | null>(null);
  const [condition, setCondition] = useState<Condition>("NM");
  const [language, setLanguage] = useState("EN");
  const [finish, setFinish] = useState<Finish>("holo");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const suggested = card?.trendHal != null ? sellPrice({ trendHal: card.trendHal, condition, language, rules: card.rules }) : null;

  function find(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) return setResults([]);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/vykup/hledat?q=${encodeURIComponent(v.trim())}`);
      setResults(((await r.json()) as { cards: BuybackCard[] }).cards);
    }, 200);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  // po úspěšném naskladnění: připravit další kartu
  const [handled, setHandled] = useState<ActionState | null>(null);
  if (state.ok && handled !== state) {
    setHandled(state);
    setCard(null);
    setQ("");
    setResults([]);
    setQty(1);
    setPrice("");
  }
  useEffect(() => {
    if (state.ok) search.current?.focus();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pl-field">
        <label htmlFor="aq" className="pl-field__label">
          Hledat kartu v katalogu
        </label>
        <input
          ref={search}
          id="aq"
          type="search"
          value={q}
          autoComplete="off"
          onChange={(e) => find(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) {
                setCard(results[0]);
                setResults([]);
              }
            }
          }}
          placeholder="Název nebo číslo, např. svi 245"
          className="pl-field__input"
        />
        <span className="pl-field__hint">Enter vybere první výsledek. Karty mimo katalog nejdřív naimportuj v „Edice z TCGdex“.</span>
      </div>
      {results.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 rounded-xl p-1.5" style={{ background: "var(--surface-100)", border: "1.5px solid var(--line-strong)" }}>
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => (setCard(c), setResults([]))} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--surface-200)]">
                {c.image ? <Image src={c.image} alt="" width={630} height={880} sizes="28px" className="h-auto w-7 rounded-[2px]" /> : <span className="pl-tile__ph w-7" />}
                <strong className="text-[15px]">{c.name}</strong>
                <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {c.setCode} {c.number} · {c.set}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {card && (
        <form action={action} className="pl-panel flex flex-col gap-4" aria-label="Nový kus">
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="condition" value={condition} />
          <input type="hidden" name="language" value={language} />
          <input type="hidden" name="finish" value={finish} />
          <div className="flex items-center gap-3">
            {card.image ? <Image src={card.image} alt="" width={630} height={880} sizes="56px" className="h-auto w-14 rounded-[3px]" /> : <span className="pl-tile__ph w-14" />}
            <div className="flex flex-col">
              <strong className="text-lg">{card.name}</strong>
              <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                {card.set} · {card.setCode} {card.number} · trend {card.trendHal != null ? formatCzk(card.trendHal) : "neznámý"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <Pills label="Stav" value={condition} options={CONDITIONS.map((c) => [c, c])} onPick={setCondition} />
            <Pills label="Jazyk" value={language} options={BUYBACK_LANGUAGES.map((l) => [l, l])} onPick={setLanguage} />
            <Pills label="Provedení" value={finish} options={FINISH_OPTIONS} onPick={setFinish} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="pl-field w-[100px]">
              <label htmlFor="iq" className="pl-field__label">
                Počet
              </label>
              <input id="iq" name="qty" type="number" min={1} max={999} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="pl-field__input" />
            </div>
            <div className="pl-field w-[150px]">
              <label htmlFor="ip" className="pl-field__label">
                Prodejní cena
              </label>
              <span className="pl-field__wrap">
                <input id="ip" name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={suggested ? String(suggested / 100) : "zadej"} className="pl-field__input w-full pr-9" />
                <span className="pl-field__suffix">Kč</span>
              </span>
              <span className="pl-field__hint">{suggested ? `Návrh ${formatCzk(suggested)}, prázdné = návrh` : "Bez tržní ceny"}</span>
            </div>
            <div className="pl-field w-[150px]">
              <label htmlFor="ib" className="pl-field__label">
                Nákupní cena
              </label>
              <span className="pl-field__wrap">
                <input id="ib" name="purchase" inputMode="numeric" placeholder="nepovinné" className="pl-field__input w-full pr-9" />
                <span className="pl-field__suffix">Kč</span>
              </span>
              <span className="pl-field__hint">Pro výpočet marže</span>
            </div>
          </div>
          <label className="pl-check">
            <input type="checkbox" name="locked" />
            Zamknout cenu (nepřepočítávat podle trhu)
          </label>
          <button type="submit" disabled={pending} className="pl-btn pl-btn--primary self-start">
            {pending ? "Ukládám…" : `Naskladnit ${qty} ks`}
          </button>
        </form>
      )}
      {(state.ok || state.error) && (
        <p role="status" className="m-0 text-sm font-bold" style={{ color: state.error ? "var(--brand-red)" : "var(--success)" }}>
          {state.error ?? state.ok}
        </p>
      )}
    </div>
  );
}
