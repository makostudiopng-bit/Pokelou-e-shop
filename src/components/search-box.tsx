"use client";
// Vyhledávání v hlavičce s našeptávačem. Bez JavaScriptu zůstává obyčejný formulář na /karty.
// Ovládání podle vzoru ARIA combobox: šipky vybírají, Enter otevře kartu, Esc zavře.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/lib/catalog-query";
import { formatCzk } from "@/lib/pricing";

type Result = { q: string; items: Suggestion[]; total: number };

const cardHref = (s: Suggestion) => `/karta/${encodeURIComponent(s.slug)}`;
const allHref = (q: string) => `/karty?q=${encodeURIComponent(q.trim())}`;

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  // dotaz se pošle až po krátké pauze v psaní; starší odpověď nikdy nepřepíše novější
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/hledat?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await r.json()) as Omit<Result, "q">;
        setRes({ q: term, ...data });
        setActive(-1);
      } catch {
        if (!ctrl.signal.aborted) setRes({ q: term, items: [], total: 0 });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // klik mimo pole zavře návrhy
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const items = res?.items ?? [];
  const showList = open && q.trim().length >= 2 && res != null;
  // poslední řádek „Zobrazit všechny“ je taky vybratelný šipkami
  const count = items.length + (res && res.total > 0 ? 1 : 0);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (showList) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!showList || count === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? count - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(active < items.length ? cardHref(items[active]) : allHref(q));
    }
  }

  const optId = (i: number) => `${listId}-o${i}`;

  return (
    <form
      ref={boxRef}
      role="search"
      action="/karty"
      className="pl-search relative order-last flex min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-80"
      onSubmit={(e) => {
        if (!q.trim()) return;
        e.preventDefault();
        go(allHref(q));
      }}
    >
      <label htmlFor="q" className="sr-only">
        Hledat kartu
      </label>
      <input
        id="q"
        name="q"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optId(active) : undefined}
        placeholder="Jakou kartu hledáš? (např. Gardevoir 245/198)"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1 rounded-l-full border-2 border-r-0 px-5 py-2.5 text-[15px] font-medium"
        style={{ borderColor: "var(--ink)", background: "var(--surface-100)", color: "var(--ink)" }}
      />
      <button
        type="submit"
        aria-label="Hledat"
        className="grid w-14 flex-none cursor-pointer place-items-center rounded-r-full border-2"
        style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "var(--ink)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>

      <span className="sr-only" role="status" aria-live="polite">
        {showList && !loading ? (res.total === 0 ? "Nic jsme nenašli" : `${res.total} ${res.total === 1 ? "karta" : res.total < 5 ? "karty" : "karet"}`) : ""}
      </span>

      {showList && (
        <div className="pl-suggest" data-loading={loading || undefined}>
          {items.length === 0 ? (
            <p className="pl-suggest__empty">
              {loading ? "Hledám…" : (
                <>
                  Na „{res.q}“ jsme nic nenašli. Zkus jen název karty, nebo číslo jako <strong>245/198</strong>.
                </>
              )}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Návrhy karet" className="m-0 list-none p-0">
              {items.map((s, i) => (
                <li key={s.slug} id={optId(i)} role="option" aria-selected={i === active}>
                  <Link href={cardHref(s)} className="pl-suggest__item" onClick={() => setOpen(false)} onPointerMove={() => setActive(i)} tabIndex={-1}>
                    <span className="pl-suggest__thumb">
                      {s.image && <Image src={s.image} alt="" width={600} height={825} sizes="40px" className="h-full w-full object-cover" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate text-[15px] leading-5">{s.name}</strong>
                      <span className="truncate text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
                        {s.set} · {s.number}
                      </span>
                    </span>
                    <span className="flex flex-none flex-col items-end text-right">
                      {s.fromHal != null ? (
                        <>
                          <span className="text-[15px] leading-5 font-extrabold whitespace-nowrap">
                            {s.priceRange && <span className="text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>od </span>}
                            {formatCzk(s.fromHal)}
                          </span>
                          <span className="text-[12px] leading-4 font-bold" style={{ color: "var(--success)" }}>
                            {s.stock} ks skladem
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>
                          vyprodáno
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
              <li id={optId(items.length)} role="option" aria-selected={active === items.length}>
                <Link href={allHref(q)} className="pl-suggest__all" onClick={() => setOpen(false)} onPointerMove={() => setActive(items.length)} tabIndex={-1}>
                  {res.total > items.length ? `Zobrazit všech ${res.total} výsledků` : "Zobrazit v katalogu"}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
