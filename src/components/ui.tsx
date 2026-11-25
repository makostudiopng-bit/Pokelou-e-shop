// Komponenty design systému PokeLou (Button, ConditionBadge, CardTile).
// Styly jsou v src/styles/pokelou.css (třídy pl-*), stejně jako v design systému.
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Condition } from "@/db/schema";
import { getT } from "@/i18n/server";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  block?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", block, icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx("pl-btn", `pl-btn--${variant}`, size === "sm" && "pl-btn--sm", block && "pl-btn--block", className)}
    >
      {icon}
      {children}
    </button>
  );
}

const CONDITIONS: Record<Condition, { label: string; tone: "mint" | "good" | "played" }> = {
  M: { label: "Mint", tone: "mint" },
  NM: { label: "Near Mint", tone: "mint" },
  EX: { label: "Excellent", tone: "good" },
  GD: { label: "Good", tone: "good" },
  LP: { label: "Light Played", tone: "played" },
  PL: { label: "Played", tone: "played" },
  PO: { label: "Poor", tone: "played" },
};

export function ConditionBadge({ condition, long }: { condition: Condition; long?: boolean }) {
  const c = CONDITIONS[condition];
  return (
    <span className="pl-cond" title={c.label}>
      <span className={`pl-cond__dot pl-cond__dot--${c.tone}`} aria-hidden="true" />
      {condition}
      {long && <span className="pl-cond__long">{c.label}</span>}
    </span>
  );
}

export type CardTileProps = {
  href: string;
  name: string;
  set: string;
  number: string;
  condition: Condition;
  lang: string;
  finish?: string;
  priceHal: number;
  wasPriceHal?: number;
  stock: number;
  image?: string;
  priority?: boolean;
  /** Čerstvě naskladněno → štítek Novinka */
  hot?: boolean;
  /** Akce místo výchozího tlačítka (např. formulář „Do košíku“). */
  cta?: ReactNode;
};

export async function CardTile(p: CardTileProps) {
  const t = await getT();
  const out = p.stock <= 0;
  const drop = p.wasPriceHal != null && p.wasPriceHal > p.priceHal;
  return (
    <article className={cx("pl-tile", out && "pl-tile--out")}>
      <Link href={p.href} className="pl-tile__well" aria-label={`${p.name}, ${p.set} ${p.number}`}>
        {p.image ? (
          <Image
            className="pl-tile__img"
            src={p.image}
            alt=""
            width={630}
            height={880}
            sizes="(max-width: 640px) 45vw, 200px"
            priority={p.priority}
          />
        ) : (
          <div className="pl-tile__ph" role="img" aria-label={t("Obrázek karty chybí")} />
        )}
        {drop ? <span className="pl-tile__flag">{t("Zlevněno")}</span> : p.hot && !out && <span className="pl-tile__flag pl-tile__flag--hot">{t("Novinka")}</span>}
      </Link>
      <div>
        <h3 className="pl-tile__name">
          <Link href={p.href} style={{ textDecoration: "none" }}>
            {p.name}
          </Link>
        </h3>
        <p className="pl-tile__meta">
          {p.set} · <span className="pl-tile__num">{p.number}</span>
        </p>
      </div>
      <div className="pl-tile__badges">
        <ConditionBadge condition={p.condition} />
        <span className="pl-tile__lang">{p.lang}</span>
        {p.finish && <span className="pl-tile__meta">{p.finish}</span>}
      </div>
      <div className="pl-tile__row">
        <div>
          {drop && <span className="pl-tile__was">{t.price(p.wasPriceHal!)}</span>}
          <span className={cx("pl-tile__price", drop && "pl-tile__drop")}>{t.price(p.priceHal)}</span>
          <div className={cx("pl-tile__stock", out && "pl-tile__stock--out")}>
            {out ? t("Vyprodáno") : t("Skladem {n} ks", { n: p.stock })}
          </div>
        </div>
        {p.cta ??
          (out ? (
            <Link href={`${p.href}${p.href.includes("?") ? "&" : "?"}hlidat=1#hlidat`} className="pl-btn pl-btn--secondary pl-btn--sm no-underline">
              {t("Hlídat")}
            </Link>
          ) : (
            <Button variant="primary" size="sm">
              {t("Do košíku")}
            </Button>
          ))}
      </div>
    </article>
  );
}
