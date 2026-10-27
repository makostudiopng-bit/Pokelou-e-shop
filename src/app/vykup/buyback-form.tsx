"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Condition } from "@/db/schema";
import { BUYBACK_CONDITIONS, BUYBACK_LANGUAGES, estimateItem, type BuybackCard } from "@/lib/buyback-shared";
import { formatCzk } from "@/lib/pricing";
import { submitBuybackAction, type BuybackState } from "./actions";

type Line = { key: number; card: BuybackCard; condition: Condition; language: string; quantity: number };
type Payout = "cash" | "credit";

function Search({ onAdd }: { onAdd: (c: BuybackCard) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BuybackCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function search(value: string) {
    setQ(value);
    clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vykup/hledat?q=${encodeURIComponent(value.trim())}`);
        setResults(((await res.json()) as { cards: BuybackCard[] }).cards);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="bq" className="text-[15px] font-bold">
        Přidat kartu k výkupu
      </label>
      <input
        id="bq"
        type="search"
        value={q}
        onChange={(e) => search(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        placeholder="Název nebo číslo karty (např. Mimikyu TG16)"
        autoComplete="off"
        className="w-full rounded-full border-2 px-5 py-3 text-[15px] font-medium"
        style={{ borderColor: "var(--ink)", background: "var(--surface-100)", color: "var(--ink)" }}
        aria-describedby="bq-status"
      />
      <span id="bq-status" role="status" className="sr-only">
        {loading ? "Hledám" : results ? `${results.length} výsledků` : ""}
      </span>
      {results && (
        <ul className="m-0 flex max-h-[360px] list-none flex-col gap-1 overflow-y-auto rounded-xl p-1.5" style={{ background: "var(--surface-100)", border: "1.5px solid var(--line-strong)" }}>
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-sm" style={{ color: "var(--ink-muted)" }}>
              Nic jsme nenašli. Zkus anglický název karty nebo její číslo.
            </li>
          )}
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(c);
                  setQ("");
                  setResults(null);
                  document.getElementById("bq")?.focus();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--surface-200)]"
              >
                {c.image ? <Image src={c.image} alt="" width={630} height={880} sizes="32px" className="h-auto w-8 flex-none rounded-[2px]" /> : <span className="pl-tile__ph w-8" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="text-[15px]">{c.name}</strong>
                  <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {c.set} · <span style={{ fontFamily: "var(--font-mono)" }}>{c.number}</span>
                  </span>
                </span>
                <span className="text-sm font-extrabold">Přidat +</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BuybackForm({ initial, minHal, cashPct, creditPct }: { initial: BuybackCard[]; minHal: number; cashPct: number; creditPct: number }) {
  const [state, action, pending] = useActionState(submitBuybackAction, { attempt: 0, errors: {} } as BuybackState);
  const nextKey = useRef(initial.length + 1);
  const [lines, setLines] = useState<Line[]>(() => initial.map((card, i) => ({ key: i + 1, card, condition: "NM", language: "EN", quantity: 1 })));
  const [payout, setPayout] = useState<Payout>("cash");
  const [email, setEmail] = useState("");
  const [bank, setBank] = useState("");
  const [adult, setAdult] = useState(false);
  const e = state.errors;

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const add = (card: BuybackCard) =>
    setLines((ls) => {
      const same = ls.find((l) => l.card.id === card.id && l.condition === "NM" && l.language === "EN");
      if (same) return ls.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
      return [...ls, { key: nextKey.current++, card, condition: "NM", language: "EN", quantity: 1 }];
    });

  const priced = useMemo(() => lines.map((l) => ({ l, est: estimateItem(l.card, l, payout) })), [lines, payout]);
  const total = priced.reduce((a, p) => a + p.est.totalHal, 0);
  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const bulk = priced.filter((p) => p.est.bulkOnly).reduce((a, p) => a + p.l.quantity, 0);
  const itemsJson = JSON.stringify(lines.map((l) => ({ cardId: l.card.id, condition: l.condition, language: l.language, quantity: l.quantity })));

  return (
    <form action={action} noValidate className="flex flex-wrap items-start gap-6">
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="payout" value={payout} />

      <section aria-label="Karty k výkupu" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <Search onAdd={add} />
        {e.items && <span className="pl-field__error">{e.items}</span>}

        {priced.map(({ l, est }) => (
          <div key={l.key} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] p-4" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
            {l.card.image ? <Image src={l.card.image} alt="" width={630} height={880} sizes="56px" className="h-auto w-14 flex-none rounded-[4px]" /> : <span className="pl-tile__ph w-14" />}
            <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
              <strong className="text-[17px] leading-[22px]">{l.card.name}</strong>
              <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                {l.card.set} · <span style={{ fontFamily: "var(--font-mono)" }}>{l.card.number}</span>
              </span>
            </div>
            <div role="radiogroup" aria-label={`Stav karty ${l.card.name}`} className="flex flex-wrap gap-1">
              {BUYBACK_CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={l.condition === c}
                  onClick={() => update(l.key, { condition: c })}
                  className="h-9 min-w-10 cursor-pointer rounded-md px-2 text-xs font-bold"
                  style={
                    l.condition === c
                      ? { background: "var(--surface-inverse)", color: "var(--ink-inverse)", border: "1.5px solid var(--surface-inverse)" }
                      : { background: "var(--surface-100)", color: "var(--ink)", border: "1.5px solid var(--line-strong)" }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor={`lang-${l.key}`}>
              Jazyk karty
            </label>
            <select id={`lang-${l.key}`} value={l.language} onChange={(ev) => update(l.key, { language: ev.target.value })} className="pl-select h-9 py-1">
              {BUYBACK_LANGUAGES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <div role="group" aria-label="Počet kusů" className="flex items-center rounded-full" style={{ border: "2px solid var(--ink)" }}>
              <button type="button" aria-label="Ubrat kus" onClick={() => update(l.key, { quantity: Math.max(1, l.quantity - 1) })} className="h-9 w-9 cursor-pointer text-lg font-extrabold">
                −
              </button>
              <span className="min-w-6 text-center font-extrabold">{l.quantity}</span>
              <button type="button" aria-label="Přidat kus" onClick={() => update(l.key, { quantity: Math.min(50, l.quantity + 1) })} className="h-9 w-9 cursor-pointer text-lg font-extrabold">
                +
              </button>
            </div>
            <div className="flex min-w-[96px] flex-col text-right">
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                odhad
              </span>
              <strong className="text-lg leading-6">
                {est.noPrice ? "posoudíme" : est.rejected ? "nevykupujeme" : est.bulkOnly ? "bulk" : formatCzk(est.totalHal)}
              </strong>
              {est.acceptedQty > 0 && est.acceptedQty < l.quantity && (
                <span className="text-xs" style={{ color: "var(--brand-red)" }}>
                  max. {est.acceptedQty} ks
                </span>
              )}
            </div>
            <button type="button" aria-label={`Odebrat ${l.card.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="pl-wiggle-hover grid h-10 w-10 cursor-pointer place-items-center" style={{ color: "var(--ink-muted)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        ))}

        {lines.length === 0 && <div className="pl-empty text-[15px]">Zatím žádné karty. Přidej první přes vyhledávání.</div>}

        <p className="pl-note m-0">
          Karty s odhadem pod {formatCzk(minHal)} za kus vykupujeme jen hromadně jako bulk. Stavy karet popisuje <Link href="/stav-karet">průvodce stavem</Link>.
        </p>
      </section>

      <aside
        aria-label="Souhrn výkupu"
        className="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-4 rounded-2xl p-[22px] md:sticky md:top-4"
        style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "var(--shadow-sticker)" }}
      >
        <h2 className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Souhrn
        </h2>
        {e.form && (
          <p role="alert" className="m-0 text-sm font-bold" style={{ color: "var(--brand-red)" }}>
            {e.form}
          </p>
        )}
        <div role="radiogroup" aria-label="Způsob výplaty" className="grid grid-cols-2 gap-2">
          {(
            [
              ["cash", "Peníze", "převodem na účet"],
              ["credit", "Kredit", `do e-shopu, ${creditPct} % místo ${cashPct} %`],
            ] as const
          ).map(([id, t, d]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={payout === id}
              onClick={() => setPayout(id)}
              className="flex cursor-pointer flex-col items-start rounded-[10px] px-3.5 py-3 text-left"
              style={payout === id ? { background: "var(--surface-200)", border: "2px solid var(--ink)" } : { background: "var(--surface-100)", border: "1.5px solid var(--line-strong)" }}
            >
              <strong>{t}</strong>
              <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                {d}
              </span>
            </button>
          ))}
        </div>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[15px]">
          <dt style={{ color: "var(--ink-muted)" }}>Karet</dt>
          <dd className="m-0 text-right font-bold">{count} ks</dd>
          <dt style={{ color: "var(--ink-muted)" }}>Výkupní sazba</dt>
          <dd className="m-0 text-right font-bold">{payout === "cash" ? cashPct : creditPct} % tržní ceny</dd>
          {bulk > 0 && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>Bulk</dt>
              <dd className="m-0 text-right font-bold">{bulk} ks</dd>
            </>
          )}
        </dl>
        <div className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-3.5" style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", border: "2px solid var(--ink)" }}>
          <span className="text-[15px] font-extrabold">Odhad celkem</span>
          <strong className="text-[40px] leading-10" style={{ fontFamily: "var(--font-display)" }} aria-live="polite">
            {formatCzk(total)}
          </strong>
        </div>

        <div className={`pl-field${e.email ? " pl-field--error" : ""}`}>
          <label htmlFor="b-email" className="pl-field__label">
            E-mail
          </label>
          <input id="b-email" name="email" type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="jan@email.cz" className="pl-field__input" aria-invalid={e.email ? true : undefined} aria-describedby="b-email-msg" />
          <span id="b-email-msg" className={e.email ? "pl-field__error" : "pl-field__hint"}>
            {e.email ?? "Pošleme sem číslo výkupu a instrukce."}
          </span>
        </div>
        {payout === "cash" && (
          <div className={`pl-field${e.bankAccount ? " pl-field--error" : ""}`}>
            <label htmlFor="b-bank" className="pl-field__label">
              Číslo účtu
            </label>
            <input id="b-bank" name="bankAccount" value={bank} onChange={(ev) => setBank(ev.target.value)} placeholder="123456789/0100" className="pl-field__input" aria-invalid={e.bankAccount ? true : undefined} aria-describedby={e.bankAccount ? "b-bank-err" : undefined} />
            {e.bankAccount && (
              <span id="b-bank-err" className="pl-field__error">
                {e.bankAccount}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="pl-check items-start text-[13px] leading-[18px]">
            <input type="checkbox" name="adult" checked={adult} onChange={(ev) => setAdult(ev.target.checked)} className="mt-0.5" aria-invalid={e.adult ? true : undefined} />
            <span>
              Je mi 18 let a karty jsou moje. Souhlasím s <Link href="/obchodni-podminky#vykup">podmínkami výkupu</Link>.
            </span>
          </label>
          {e.adult && <span className="pl-field__error">{e.adult}</span>}
        </div>
        <button type="submit" disabled={pending || lines.length === 0} className="pl-btn pl-btn--primary pl-btn--block">
          {pending ? "Odesílám…" : "Odeslat k výkupu"}
        </button>
        <p className="pl-note m-0">Odhad platí 7 dní. Cena se může po kontrole změnit; pak ti pošleme protinabídku, nebo karty vrátíme.</p>
      </aside>
    </form>
  );
}
