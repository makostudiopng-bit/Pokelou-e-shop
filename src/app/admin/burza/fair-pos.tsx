"use client";
// Prodejní režim pro burzu. Funguje i bez internetu:
// - sklad se drží v telefonu (localStorage) a hledá se v něm lokálně,
// - prodeje jdou do fronty v telefonu a odešlou se samy, jakmile je spojení,
// - každý prodej má ID z telefonu, takže opakované odeslání na serveru nic nezdvojí.
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { norm } from "@/lib/catalog-query";
import { formatCzk } from "@/lib/pricing";

type Item = { id: string; name: string; set: string; setCode: string; number: string; condition: string; lang: string; finish: string; priceHal: number; stock: number; image: string | null };
type Payment = "cash" | "card" | "transfer";
type Sale = { id: string; receiptId: string; eventName: string; stockItemId: string | null; title: string; quantity: number; unitHal: number; payment: Payment; soldAt: string };
type Line = { key: string; stockItemId: string | null; title: string; meta: string; image: string | null; qty: number; unitHal: number; listHal: number | null };
type LogEntry = { id: string; receiptId: string; title: string; quantity: number; unitHal: number; payment: Payment; soldAt: string; status: "pending" | "ok" | "conflict" | "cancelled" | "error"; error?: string };
type ServerSale = { id: string; receiptId: string; eventName: string; title: string; quantity: number; unitHal: number; listHal: number | null; payment: Payment; status: "ok" | "conflict" | "cancelled"; soldAt: string; resolvedAt: string | null };

const K = { items: "pl_fair_items", outbox: "pl_fair_outbox", log: "pl_fair_log", event: "pl_fair_event", basket: "pl_fair_basket" };
const PAY: Record<Payment, string> = { cash: "Hotově", card: "Kartou", transfer: "Převodem" };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* plné úložiště nebo soukromé okno: data zůstanou jen v paměti */
  }
}
const kc = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const today = () => new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

export function FairPos() {
  const [items, setItems] = useState<{ list: Item[]; at: string | null }>(() => load(K.items, { list: [], at: null }));
  const [outbox, setOutbox] = useState<Sale[]>(() => load(K.outbox, []));
  const [log, setLog] = useState<LogEntry[]>(() => load(K.log, []));
  const [eventName, setEventName] = useState<string>(() => load(K.event, `Burza ${today()}`));
  const [basket, setBasket] = useState<Line[]>(() => load(K.basket, []));
  const [payment, setPayment] = useState<Payment>("cash");
  const [given, setGiven] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"sell" | "sales">("sell");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [needLogin, setNeedLogin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [server, setServer] = useState<ServerSale[] | null>(null);
  const syncing = useRef(false);
  const outboxRef = useRef(outbox);

  useEffect(() => {
    outboxRef.current = outbox;
    save(K.outbox, outbox);
  }, [outbox]);
  useEffect(() => save(K.log, log.slice(0, 200)), [log]);
  useEffect(() => save(K.event, eventName), [eventName]);
  useEffect(() => save(K.basket, basket), [basket]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshStock = useCallback(async () => {
    try {
      const r = await fetch("/admin/api/burza", { cache: "no-store" });
      if (r.status === 401) return setNeedLogin(true);
      if (!r.ok) return;
      const data = (await r.json()) as { items: Item[]; at: string };
      const next = { list: data.items, at: data.at };
      setItems(next);
      save(K.items, next);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  const flush = useCallback(async () => {
    const batch = outboxRef.current.slice(0, 100);
    if (syncing.current || batch.length === 0) return;
    syncing.current = true;
    try {
      const r = await fetch("/admin/api/burza", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sales: batch }) });
      if (r.status === 401) {
        setNeedLogin(true);
        return;
      }
      const data = (await r.json()) as { results?: { id: string; status: LogEntry["status"]; error?: string }[] };
      const results = data.results ?? [];
      setOnline(true);
      if (results.length === 0) return;
      const done = new Map(results.map((x) => [x.id, x]));
      setOutbox((o) => o.filter((x) => !done.has(x.id)));
      setLog((l) => l.map((e) => (done.has(e.id) ? { ...e, status: done.get(e.id)!.status, error: done.get(e.id)!.error } : e)));
      const conflicts = results.filter((x) => x.status === "conflict").length;
      if (conflicts > 0) flash(`⚠️ ${conflicts}× kus se mezitím prodal jinde, viz Prodeje`);
      // po prodeji obnovit sklad, ať vidíme i prodeje z e-shopu
      void refreshStock();
    } catch {
      setOnline(false);
    } finally {
      syncing.current = false;
    }
  }, [flash, refreshStock]);

  // síť: odeslat frontu, jakmile je spojení; sklad obnovovat každou minutu
  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flush();
      void refreshStock();
    };
    const off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    const first = setTimeout(on, 0);
    const t1 = setInterval(() => void flush(), 15_000);
    const t2 = setInterval(() => void refreshStock(), 60_000);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
      clearTimeout(first);
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [flush, refreshStock]);

  // kolik kusů ještě zbývá: sklad − neodeslané prodeje − košík
  const held = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of outbox) if (s.stockItemId) m.set(s.stockItemId, (m.get(s.stockItemId) ?? 0) + s.quantity);
    for (const l of basket) if (l.stockItemId) m.set(l.stockItemId, (m.get(l.stockItemId) ?? 0) + l.qty);
    return m;
  }, [outbox, basket]);
  const left = (it: Item) => it.stock - (held.get(it.id) ?? 0);

  const results = useMemo(() => {
    const t = norm(q.trim()).split(/\s+/).filter(Boolean);
    const list = t.length === 0 ? items.list : items.list.filter((it) => t.every((x) => norm(`${it.name} ${it.number} ${it.set} ${it.setCode} ${it.condition}`).includes(x)));
    return list.slice(0, 40);
  }, [q, items.list]);

  function add(it: Item) {
    if (left(it) <= 0) return flash("Víc kusů skladem není");
    setBasket((b) => {
      const ex = b.find((l) => l.stockItemId === it.id);
      if (ex) return b.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...b, { key: crypto.randomUUID(), stockItemId: it.id, title: it.name, meta: `${it.setCode} ${it.number} · ${it.condition} · ${it.lang}`, image: it.image, qty: 1, unitHal: it.priceHal, listHal: it.priceHal }];
    });
  }

  function setLine(key: string, patch: Partial<Line>) {
    setBasket((b) => b.map((l) => (l.key === key ? { ...l, ...patch } : l)).filter((l) => l.qty > 0));
  }

  const total = basket.reduce((a, l) => a + l.qty * l.unitHal, 0);
  const listTotal = basket.reduce((a, l) => a + l.qty * (l.listHal ?? l.unitHal), 0);
  const givenHal = kc(given);
  const change = givenHal != null && given.trim() !== "" ? givenHal - total : null;

  function sell() {
    if (basket.length === 0) return;
    for (const l of basket) {
      const it = l.stockItemId ? items.list.find((x) => x.id === l.stockItemId) : null;
      if (it && l.qty > it.stock - ((held.get(it.id) ?? 0) - l.qty)) return flash(`${l.title}: víc kusů skladem není`);
    }
    const receiptId = crypto.randomUUID();
    const soldAt = new Date().toISOString();
    const sales: Sale[] = basket.map((l) => ({ id: crypto.randomUUID(), receiptId, eventName: eventName.trim() || `Burza ${today()}`, stockItemId: l.stockItemId, title: l.title, quantity: l.qty, unitHal: l.unitHal, payment, soldAt }));
    setOutbox((o) => [...o, ...sales]);
    setLog((lg) => [...sales.map((s) => ({ id: s.id, receiptId, title: s.title, quantity: s.quantity, unitHal: s.unitHal, payment, soldAt, status: "pending" as const })), ...lg]);
    setBasket([]);
    setGiven("");
    setQ("");
    flash(`Prodáno · ${formatCzk(total)}${online ? "" : " (odešle se, až bude internet)"}`);
    setTimeout(() => void flush(), 50);
  }

  async function loadServer() {
    try {
      const r = await fetch("/admin/api/burza/prodeje", { cache: "no-store" });
      if (r.status === 401) return setNeedLogin(true);
      setServer(((await r.json()) as { sales: ServerSale[] }).sales);
    } catch {
      setOnline(false);
    }
  }

  async function storno(id: string) {
    if (!confirm("Stornovat prodej? Kus se vrátí do skladu i na e-shop.")) return;
    try {
      const r = await fetch("/admin/api/burza/storno", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) return flash(d.error ?? "Storno se nepovedlo");
      setLog((l) => l.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)));
      flash("Stornováno, kus je zpátky ve skladu");
      void loadServer();
      void refreshStock();
    } catch {
      flash("Storno potřebuje internet");
    }
  }

  const pending = outbox.length;
  const shownSales: (LogEntry | ServerSale)[] = server
    ? [...log.filter((e) => e.status === "pending" || e.status === "error"), ...server]
    : log;
  const day = shownSales.filter((x) => x.status !== "cancelled" && x.status !== "error");
  const sum = (p?: Payment) => day.filter((x) => !p || x.payment === p).reduce((a, x) => a + x.unitHal * x.quantity, 0);

  return (
    <div className="pl-pos">
      <header className="pl-pos__bar">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-extrabold tracking-wide uppercase opacity-70">Prodej na burze</span>
          <input className="pl-pos__event" value={eventName} onChange={(e) => setEventName(e.target.value)} aria-label="Název burzy" />
        </div>
        <span className={`pl-pos__net ${online ? "is-on" : "is-off"}`} role="status">
          {online ? "Online" : "Bez internetu"}
          {pending > 0 && ` · ${pending} čeká`}
        </span>
      </header>

      {needLogin && (
        <div className="pl-pos__alert">
          Přihlášení vypršelo. Prodeje zůstávají v telefonu.{" "}
          <a href="/admin/prihlaseni" target="_blank" rel="noreferrer">
            Přihlas se v nové záložce
          </a>{" "}
          a pak klepni{" "}
          <button type="button" className="pl-linkbtn" onClick={() => (setNeedLogin(false), void flush(), void refreshStock())}>
            odeslat znovu
          </button>
          .
        </div>
      )}

      <nav className="pl-pos__tabs" aria-label="Režim">
        <button type="button" aria-pressed={tab === "sell"} onClick={() => setTab("sell")}>
          Prodej
        </button>
        <button type="button" aria-pressed={tab === "sales"} onClick={() => (setTab("sales"), void loadServer())}>
          Prodeje {log.length > 0 && <span className="pl-count">{log.filter((e) => e.status !== "cancelled").length}</span>}
        </button>
      </nav>

      {tab === "sell" ? (
        <>
          <div className="pl-pos__search">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Název nebo číslo karty…" aria-label="Hledat kartu ve skladu" autoComplete="off" />
            <button type="button" className="pl-btn pl-btn--secondary pl-btn--sm" onClick={() => setManual((m) => !m)}>
              + Ruční
            </button>
          </div>
          <p className="pl-note m-0 px-4">
            {items.at ? `Sklad: ${items.list.length} kusů, aktualizováno ${new Date(items.at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}` : "Sklad se načítá…"}{" "}
            <button type="button" className="pl-linkbtn" onClick={() => void refreshStock()}>
              obnovit
            </button>
          </p>

          {manual && <ManualForm onAdd={(l) => (setBasket((b) => [...b, l]), setManual(false))} />}

          <ul className="pl-pos__list">
            {results.map((it) => {
              const n = left(it);
              return (
                <li key={it.id}>
                  <button type="button" className="pl-pos__item" onClick={() => add(it)} disabled={n <= 0}>
                    <span className="pl-pos__thumb">{it.image && <Image src={it.image} alt="" width={600} height={825} sizes="44px" className="h-full w-full object-cover" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col text-left">
                      <strong className="truncate">{it.name}</strong>
                      <span className="truncate text-[12px] opacity-75">
                        {it.setCode} {it.number} · {it.condition} · {it.lang}
                        {it.finish ? ` · ${it.finish}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <strong className="whitespace-nowrap">{formatCzk(it.priceHal)}</strong>
                      <span className="text-[12px]" style={{ color: n > 0 ? "var(--success)" : "var(--brand-red)" }}>
                        {n > 0 ? `${n} ks` : "není"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {results.length === 0 && <li className="pl-note p-4">Nic takového skladem není. Prodej jde zapsat i jako ruční položku.</li>}
          </ul>

          {basket.length > 0 && (
            <section className="pl-pos__basket" aria-label="Účtenka">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {basket.map((l) => (
                  <li key={l.key} className="pl-pos__line">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate text-[14px]">{l.title}</strong>
                      <span className="truncate text-[11px] opacity-70">{l.meta}</span>
                    </span>
                    <span className="pl-pos__qty">
                      <button type="button" onClick={() => setLine(l.key, { qty: l.qty - 1 })} aria-label="Ubrat">
                        −
                      </button>
                      <span>{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const it = l.stockItemId ? items.list.find((x) => x.id === l.stockItemId) : null;
                          if (it && left(it) <= 0) return flash("Víc kusů skladem není");
                          setLine(l.key, { qty: l.qty + 1 });
                        }}
                        aria-label="Přidat"
                      >
                        +
                      </button>
                    </span>
                    <PriceInput valueHal={l.unitHal} onChange={(v) => setLine(l.key, { unitHal: v })} />
                  </li>
                ))}
              </ul>
              <div className="pl-pos__pay" role="radiogroup" aria-label="Platba">
                {(Object.keys(PAY) as Payment[]).map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={payment === p} onClick={() => setPayment(p)}>
                    {PAY[p]}
                  </button>
                ))}
              </div>
              {payment === "cash" && (
                <label className="flex items-center justify-between gap-3 text-[14px]">
                  <span>Zákazník dal</span>
                  <input className="pl-pos__given" inputMode="decimal" placeholder="Kč" value={given} onChange={(e) => setGiven(e.target.value)} />
                  <strong style={{ color: change != null && change < 0 ? "var(--brand-red)" : undefined }}>
                    {change == null ? "" : change < 0 ? `chybí ${formatCzk(-change)}` : `vrátit ${formatCzk(change)}`}
                  </strong>
                </label>
              )}
              <button type="button" className="pl-btn pl-btn--primary pl-btn--block pl-pos__sell" onClick={sell}>
                Prodáno · {formatCzk(total)}
                {listTotal > total && <span className="text-[12px] font-bold opacity-80"> (sleva {formatCzk(listTotal - total)})</span>}
              </button>
              <button type="button" className="pl-linkbtn self-center" onClick={() => setBasket([])}>
                Vyprázdnit účtenku
              </button>
            </section>
          )}
        </>
      ) : (
        <section className="flex flex-col gap-3 p-4">
          <div className="pl-pos__sum">
            <div>
              <span>Celkem</span>
              <strong>{formatCzk(sum())}</strong>
            </div>
            <div>
              <span>Hotově</span>
              <strong>{formatCzk(sum("cash"))}</strong>
            </div>
            <div>
              <span>Kartou</span>
              <strong>{formatCzk(sum("card"))}</strong>
            </div>
            <div>
              <span>Převodem</span>
              <strong>{formatCzk(sum("transfer"))}</strong>
            </div>
          </div>
          <p className="pl-note m-0">{server ? "Prodeje za posledních 24 hodin ze všech zařízení." : "Bez internetu: jen prodeje z tohoto telefonu."}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {shownSales.map((x) => (
              <li key={x.id} className={`pl-pos__sale is-${x.status}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-[14px]">
                    {x.quantity > 1 && `${x.quantity}× `}
                    {x.title}
                  </strong>
                  <span className="text-[12px] opacity-75">
                    {new Date(x.soldAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} · {PAY[x.payment]} ·{" "}
                    {x.status === "pending"
                      ? "čeká na odeslání"
                      : x.status === "ok"
                        ? "odečteno ze skladu"
                        : x.status === "conflict"
                          ? "KONFLIKT: kus se mezitím prodal jinde (e-shop), vyřeš v administraci"
                          : x.status === "cancelled"
                            ? "stornováno"
                            : `chyba: ${"error" in x ? x.error : ""}`}
                  </span>
                </span>
                <strong className="whitespace-nowrap">{formatCzk(x.unitHal * x.quantity)}</strong>
                {(x.status === "ok" || x.status === "conflict") && (
                  <button type="button" className="pl-linkbtn" onClick={() => void storno(x.id)}>
                    Storno
                  </button>
                )}
              </li>
            ))}
            {shownSales.length === 0 && <li className="pl-note">Zatím žádné prodeje.</li>}
          </ul>
        </section>
      )}

      {toast && (
        <div className="pl-pos__toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function PriceInput({ valueHal, onChange }: { valueHal: number; onChange: (hal: number) => void }) {
  const [text, setText] = useState(String(valueHal / 100));
  return (
    <span className="pl-pos__price">
      <input
        inputMode="decimal"
        value={text}
        aria-label="Cena za kus v Kč"
        onChange={(e) => {
          setText(e.target.value);
          const v = kc(e.target.value);
          if (v != null) onChange(v);
        }}
      />
      Kč
    </span>
  );
}

function ManualForm({ onAdd }: { onAdd: (l: Line) => void }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const hal = kc(price);
  const n = Number.parseInt(qty, 10);
  const ok = title.trim() && hal != null && n > 0;
  return (
    <form
      className="pl-pos__manual"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onAdd({ key: crypto.randomUUID(), stockItemId: null, title: title.trim(), meta: "ruční položka (mimo sklad)", image: null, qty: n, unitHal: hal!, listHal: null });
      }}
    >
      <input placeholder="Co prodáváš (např. Bulk 50 ks)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Název" />
      <input placeholder="Cena Kč" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Cena za kus" />
      <input placeholder="ks" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Počet kusů" />
      <button type="submit" className="pl-btn pl-btn--primary pl-btn--sm" disabled={!ok}>
        Přidat
      </button>
    </form>
  );
}
