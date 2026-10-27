"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import type { PaymentId, ShippingId } from "@/config/shop";
import { paymentAllowed, totals } from "@/lib/checkout-calc";
import { formatCzk } from "@/lib/pricing";
import { placeOrderAction, type CheckoutState } from "./actions";

type Option = { id: string; title: string; note: string; priceHal: number };
export type SummaryItem = { id: string; name: string; meta: string; lineHal: number; image: string | null };

const priceText = (hal: number, plus = false) => (hal === 0 ? "zdarma" : `${plus ? "+ " : ""}${formatCzk(hal)}`);

function Field({
  name,
  label,
  error,
  hint,
  defaultValue,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  placeholder?: string;
  className?: string;
}) {
  const id = `f-${name}`;
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`pl-field${error ? " pl-field--error" : ""} ${className ?? ""}`}>
      <label htmlFor={id} className="pl-field__label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={desc}
        className="pl-field__input"
      />
      {error ? (
        <span id={`${id}-err`} className="pl-field__error">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="pl-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${n}`} className="flex flex-col gap-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
      <h2 id={`sec-${n}`} className="m-0 flex items-center gap-3 text-[28px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        <span className="pl-sticker-num" style={{ width: 40, height: 40, fontSize: 20 }} aria-hidden="true">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({
  name,
  value,
  checked,
  disabled,
  onPick,
  title,
  note,
  price,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onPick: () => void;
  title: string;
  note: string;
  price: string;
}) {
  return (
    <label
      className="flex items-center gap-3.5 rounded-xl px-4 py-3.5"
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--surface-200)" : "var(--surface-100)",
        border: `2px solid ${checked ? "var(--ink)" : "var(--line)"}`,
        boxShadow: checked ? "var(--shadow-sticker)" : "none",
      }}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onPick} className="h-5 w-5 flex-none" style={{ accentColor: "var(--ink)" }} />
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="text-base">{title}</strong>
        <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
          {note}
        </span>
      </span>
      <strong className="text-[15px] whitespace-nowrap">{price}</strong>
    </label>
  );
}

function Fields({
  state,
  items,
  subtotalHal,
  shipping,
  payment,
  cardEnabled,
  pickupAddress,
  pending,
}: {
  state: CheckoutState;
  items: SummaryItem[];
  subtotalHal: number;
  shipping: Option[];
  payment: Option[];
  cardEnabled: boolean;
  pickupAddress: string;
  pending: boolean;
}) {
  const v = state.values;
  const e = state.errors;
  const [ship, setShip] = useState<ShippingId>((v?.shipping as ShippingId) ?? "zasilkovna");
  const [payPick, setPay] = useState<PaymentId>((v?.payment as PaymentId) ?? (cardEnabled ? "card" : "bank_transfer"));
  const [company, setCompany] = useState(Boolean(v?.company));
  // když vybraná platba k dopravě nesedí, přepni na převod
  const pay: PaymentId = paymentAllowed(payPick, ship, cardEnabled) ? payPick : "bank_transfer";
  const t = totals(subtotalHal, ship, pay);
  const shipTitle = shipping.find((s) => s.id === ship)?.title;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        {e.form && (
          <p role="alert" className="m-0 rounded-xl px-4 py-3 text-[15px] font-bold" style={{ background: "var(--surface-100)", border: "2px solid var(--brand-red)", color: "var(--brand-red)" }}>
            {e.form}
          </p>
        )}

        <Section n={1} title="Kontakt">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="email" label="E-mail" type="email" autoComplete="email" inputMode="email" placeholder="jan@email.cz" hint="Pošleme sem potvrzení a sledování zásilky." defaultValue={v?.email} error={e.email} />
            <Field name="phone" label="Telefon" type="tel" autoComplete="tel" inputMode="tel" placeholder="+420 777 123 456" hint="Kvůli doručení zásilky." defaultValue={v?.phone} error={e.phone} />
            <Field name="name" label="Jméno a příjmení" autoComplete="name" placeholder="Jan Novák" defaultValue={v?.name} error={e.name} className="sm:col-span-2" />
          </div>
          <p className="pl-note m-0">Účet nepotřebuješ, objednáš i bez registrace.</p>
        </Section>

        <Section n={2} title="Doprava">
          <div role="radiogroup" aria-label="Doprava" className="flex flex-col gap-2.5">
            {shipping.map((o) => (
              <Choice key={o.id} name="shipping" value={o.id} checked={ship === o.id} onPick={() => setShip(o.id as ShippingId)} title={o.title} note={o.note} price={priceText(o.priceHal)} />
            ))}
          </div>
          {ship === "zasilkovna" && (
            <Field name="point" label="Výdejní místo nebo Z-BOX" placeholder="Např. Z-BOX Praha 3, Seifertova 12" hint="Výběr na mapě připojíme se Zásilkovnou. Zatím stačí napsat adresu nebo název místa." defaultValue={v?.point} error={e.point} />
          )}
          {ship === "ceska_posta" && (
            <div className="grid gap-4 sm:grid-cols-[2fr_1.4fr_1fr]">
              <Field name="street" label="Ulice a číslo" autoComplete="street-address" placeholder="Dlouhá 12" defaultValue={v?.street} error={e.street} />
              <Field name="city" label="Město" autoComplete="address-level2" placeholder="Praha" defaultValue={v?.city} error={e.city} />
              <Field name="zip" label="PSČ" autoComplete="postal-code" inputMode="numeric" placeholder="110 00" defaultValue={v?.zip} error={e.zip} />
            </div>
          )}
          {ship === "pickup" && (
            <p className="m-0 rounded-xl px-4 py-3 text-[15px]" style={{ background: "var(--surface-200)" }}>
              Vyzvednutí na adrese <strong>{pickupAddress}</strong>. Napíšeme ti, až bude objednávka připravená.
            </p>
          )}
          <p className="pl-note m-0">Dražší zásilky posíláme vždy pojištěné.</p>
        </Section>

        <Section n={3} title="Platba">
          <div role="radiogroup" aria-label="Platba" className="flex flex-col gap-2.5">
            {payment.map((o) => {
              const off = !paymentAllowed(o.id as PaymentId, ship, cardEnabled);
              const note = o.id === "card" && !cardEnabled ? "Připravujeme, brzy spustíme" : o.id === "cod" && off ? "Jen při doručení Zásilkovnou nebo poštou" : o.note;
              return <Choice key={o.id} name="payment" value={o.id} checked={pay === o.id} disabled={off} onPick={() => setPay(o.id as PaymentId)} title={o.title} note={note} price={priceText(o.priceHal, true)} />;
            })}
          </div>
          {e.payment && <span className="pl-field__error">{e.payment}</span>}
        </Section>

        <div className="flex flex-col gap-3 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
          <label className="pl-check font-bold">
            <input type="checkbox" name="company" checked={company} onChange={(ev) => setCompany(ev.target.checked)} />
            Chci fakturu na firmu
          </label>
          {company && <Field name="companyId" label="IČO" inputMode="numeric" placeholder="12345678" defaultValue={v?.companyId} error={e.companyId} className="max-w-[220px]" />}
          <div className="pl-field">
            <label htmlFor="f-note" className="pl-field__label">
              Poznámka k objednávce (nepovinné)
            </label>
            <textarea id="f-note" name="note" rows={3} maxLength={1000} defaultValue={v?.note} className="pl-field__input" />
          </div>
        </div>
      </div>

      <aside
        aria-label="Souhrn objednávky"
        className="flex min-w-0 max-w-[440px] flex-[1_1_340px] flex-col gap-4 rounded-2xl p-[22px] md:sticky md:top-4"
        style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "var(--shadow-sticker)" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Souhrn
          </h2>
          <Link href="/kosik" className="text-sm font-bold">
            Upravit košík
          </Link>
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              {it.image ? <Image src={it.image} alt="" width={630} height={880} sizes="40px" className="h-auto w-10 flex-none rounded-[3px]" /> : <span className="pl-tile__ph w-10" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate text-sm">{it.name}</strong>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {it.meta}
                </span>
              </span>
              <strong className="text-sm whitespace-nowrap">{formatCzk(it.lineHal)}</strong>
            </li>
          ))}
        </ul>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[15px] leading-[22px]" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <dt style={{ color: "var(--ink-muted)" }}>Karty</dt>
          <dd className="m-0 text-right font-bold">{formatCzk(t.itemsHal)}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>Doprava · {shipTitle}</dt>
          <dd className="m-0 text-right font-bold">{priceText(t.shippingHal)}</dd>
          {t.codFeeHal > 0 && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>Dobírka</dt>
              <dd className="m-0 text-right font-bold">{formatCzk(t.codFeeHal)}</dd>
            </>
          )}
        </dl>
        <div className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-3.5" style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", border: "2px solid var(--ink)" }}>
          <span className="text-[15px] font-extrabold">Celkem</span>
          <strong className="text-[40px] leading-10" style={{ fontFamily: "var(--font-display)" }} aria-live="polite">
            {formatCzk(t.totalHal)}
          </strong>
        </div>
        <div className="flex flex-col gap-1">
          <label className="pl-check items-start text-[13px] leading-[18px]">
            <input type="checkbox" name="terms" defaultChecked={v?.terms} aria-invalid={e.terms ? true : undefined} aria-describedby={e.terms ? "f-terms-err" : undefined} className="mt-0.5" />
            <span>
              Souhlasím s <Link href="/obchodni-podminky">obchodními podmínkami</Link> a beru na vědomí <Link href="/ochrana-osobnich-udaju">zpracování osobních údajů</Link>.
            </span>
          </label>
          {e.terms && (
            <span id="f-terms-err" className="pl-field__error">
              {e.terms}
            </span>
          )}
        </div>
        <button type="submit" disabled={pending} className="pl-btn pl-btn--primary pl-btn--block">
          {pending ? "Odesílám…" : pay === "card" ? "Objednat a zaplatit" : "Odeslat objednávku zavazující k platbě"}
        </button>
        <p className="pl-note m-0">Ceny dopravy a dobírky jsou zatím ukázkové.</p>
      </aside>
    </div>
  );
}

export function CheckoutForm(props: {
  items: SummaryItem[];
  subtotalHal: number;
  shipping: Option[];
  payment: Option[];
  cardEnabled: boolean;
  pickupAddress: string;
}) {
  const [state, action, pending] = useActionState(placeOrderAction, { attempt: 0, errors: {} });
  return (
    <form action={action} noValidate>
      {/* po každém odeslání se pole znovu vyplní hodnotami z odpovědi */}
      <Fields key={state.attempt} state={state} pending={pending} {...props} />
    </form>
  );
}
