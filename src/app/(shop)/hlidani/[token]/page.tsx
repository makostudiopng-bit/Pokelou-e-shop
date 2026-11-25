// Stránka z odkazu v e-mailu: potvrzení hlídání, jeho stav a zrušení.
import type { Metadata } from "next";
import Link from "next/link";
import { getDb, hasDb } from "@/db";
import { getT } from "@/i18n/server";
import { watchByToken } from "@/lib/watches";
import { cancelWatchAction, confirmWatchAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hlídání karty"), robots: { index: false } };
}

export default async function HlidaniPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getT();
  const w = hasDb() ? await watchByToken(await getDb(), token) : null;

  if (!w) {
    return (
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-12 sm:px-6">
        <h1 className="m-0 text-[34px] leading-[38px] font-extrabold sm:text-[44px] sm:leading-[46px]" style={{ fontFamily: "var(--font-display)" }}>{t("Hlídání je zrušené")}</h1>
        <p className="m-0 text-[17px]">{t("Tohle hlídání už neexistuje. Další e-maily o téhle kartě ti nepošleme.")}</p>
        <Link href="/karty" className="font-bold">
          {t("Prohlédnout karty")} →
        </Link>
      </main>
    );
  }

  const { watch, card, email } = w;
  const confirmed = watch.confirmedAt != null;
  const what = watch.maxPriceHal
    ? t("Napíšeme ti, až bude karta skladem za {amount} nebo méně.", { amount: t.price(watch.maxPriceHal) })
    : t("Napíšeme ti, až bude karta zase skladem.");

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-12 sm:px-6">
      <h1 className="m-0 text-[34px] leading-[38px] font-extrabold sm:text-[44px] sm:leading-[46px]" style={{ fontFamily: "var(--font-display)" }}>{confirmed ? t("Hlídání je zapnuté") : t("Potvrď hlídání karty")}</h1>
      <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
        {card.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image.replace(/\/high\.webp$/, "/low.webp")} alt="" width={72} height={100} className="rounded-md" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={`/karta/${encodeURIComponent(card.id)}`} className="text-lg font-extrabold">
            {card.name}
          </Link>
          <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {card.set} · {card.number}
          </span>
        </div>
      </div>
      <p className="m-0 text-[17px]">
        {what} {t("E-mail pošleme na")} <strong>{email}</strong>.
      </p>
      {confirmed ? (
        <form action={cancelWatchAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="pl-btn pl-btn--secondary">
            {t("Zrušit hlídání")}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          <form action={confirmWatchAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="pl-btn pl-btn--primary">
              {t("Potvrdit hlídání")}
            </button>
          </form>
          <form action={cancelWatchAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="pl-btn pl-btn--secondary">
              {t("Nechci hlídat")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
