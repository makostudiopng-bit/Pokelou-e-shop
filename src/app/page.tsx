import Image from "next/image";
import Link from "next/link";
import { CardTile } from "@/components/ui";
import { demoCards, demoSets } from "@/data/demo";

const linkBtn =
  "pl-lift inline-flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-3.5 text-[17px] font-extrabold no-underline";

function HeroFan() {
  const [a, b, c] = [demoCards[1], demoCards[0], demoCards[2]];
  return (
    <div className="pl-fan relative h-[300px] min-w-0 flex-[1_1_440px] sm:h-[460px]" aria-hidden="true">
      <div className="absolute inset-y-0 right-0 left-[8%] top-[34px] rotate-2 rounded-3xl" style={{ background: "var(--on-yellow)" }} />
      <div
        className="absolute top-[14px] right-[4%] bottom-5 left-[4%] rounded-3xl border-[3px]"
        style={{
          backgroundColor: "var(--brand-yellow)",
          backgroundImage: "radial-gradient(rgba(20,20,20,.18) 2px, transparent 2.4px)",
          backgroundSize: "18px 18px",
          borderColor: "var(--on-yellow)",
        }}
      />
      {[
        { card: a, cls: "pl-float-a", style: { left: "14%", top: "20%", width: "36%", maxWidth: 168 } },
        { card: c, cls: "pl-float-c", style: { left: "50%", top: "21%", width: "36%", maxWidth: 168 } },
        { card: b, cls: "pl-float-b", style: { left: "31%", top: "12%", width: "42%", maxWidth: 196, zIndex: 2 } },
      ].map(({ card, cls, style }) => (
        <div key={card.slug} className={`pl-holo-card ${cls}`} style={style}>
          <Image src={card.image} alt="" width={630} height={880} sizes="200px" priority className="h-full w-full object-cover" />
        </div>
      ))}
      <div className="absolute -top-4 -right-1 z-[3] h-24 w-24 sm:h-[132px] sm:w-[132px]">
        <svg className="pl-spin absolute inset-0 h-full w-full" viewBox="0 0 132 132">
          <defs>
            <path id="pl-circle" d="M66 66m-48 0a48 48 0 1 1 96 0a48 48 0 1 1 -96 0" />
          </defs>
          <circle cx="66" cy="66" r="64" fill="var(--brand-red)" stroke="var(--on-yellow)" strokeWidth="3" />
          <text fill="#ffffff" fontFamily="Manrope Variable, sans-serif" fontSize="13" fontWeight="800" letterSpacing="2.2">
            <textPath href="#pl-circle">VÝKUP ✦ ZA KREDIT ✦ I ZA PENÍZE ✦</textPath>
          </text>
        </svg>
        <div
          className="absolute inset-[29%] grid place-items-center rounded-full border-[3px] text-base font-extrabold sm:text-[22px]"
          style={{ background: "#fff", borderColor: "var(--on-yellow)", color: "var(--on-yellow)", fontFamily: "var(--font-display)" }}
        >
          PL
        </div>
      </div>
      <div
        className="absolute bottom-8 left-0 z-[3] -rotate-[4deg] rounded-[10px] border-2 px-3.5 py-2.5 text-[15px] font-extrabold"
        style={{ background: "#fff", color: "var(--on-yellow)", borderColor: "var(--on-yellow)", boxShadow: "4px 4px 0 var(--on-yellow)" }}
      >
        Nové karty každý týden
      </div>
    </div>
  );
}

export default function Home() {
  const fresh = demoCards.slice(0, 5);
  return (
    <>
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-10 px-4 pt-10 pb-12 sm:px-6 sm:pt-14">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
          <span
            className="pl-pop pl-d1 self-start rounded-full border-2 px-3.5 py-1.5 text-[13px] leading-[18px] font-extrabold"
            style={{ background: "var(--surface-100)", borderColor: "var(--ink)" }}
          >
            Pokémon single · prodej a výkup
          </span>
          <h1
            className="m-0 flex flex-col text-[58px] leading-[54px] font-extrabold uppercase sm:text-[88px] sm:leading-[82px]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}
          >
            <span className="pl-pop pl-d2">Kup.</span>
            <span className="pl-pop pl-d3">Prodej.</span>
            <span className="pl-pop pl-d4">
              <span className="pl-hl">Sbírej.</span>
            </span>
          </h1>
          <p className="pl-pop pl-d4 m-0 max-w-[520px] text-lg leading-7" style={{ color: "var(--ink-muted)" }}>
            Tisíce jednotlivých karet skladem, s poctivě popsaným stavem. Karty, které už nepotřebuješ, od tebe vykoupíme
            za peníze nebo kredit.
          </p>
          <div className="pl-pop pl-d5 mt-2 flex flex-wrap gap-3.5">
            <Link
              href="/karty"
              className={linkBtn}
              style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "var(--ink)", boxShadow: "var(--shadow-sticker)" }}
            >
              Prohlédnout karty
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/vykup" className={`${linkBtn} pl-lift--right`} style={{ background: "var(--surface-100)", borderColor: "var(--ink)" }}>
              Prodat své karty
            </Link>
          </div>
        </div>
        <HeroFan />
      </section>

      <section aria-labelledby="new-h" className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pb-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h2 id="new-h" className="m-0 flex items-center gap-3.5 text-[44px] leading-[44px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Nově naskladněno
            <span className="pl-bounce rounded-md px-2 py-1.5 text-[13px] leading-none font-extrabold tracking-wide" style={{ background: "var(--brand-red)", color: "var(--on-red)", fontFamily: "var(--font-sans)" }}>
              NOVÉ
            </span>
          </h2>
          <Link href="/karty" className="text-[15px] font-extrabold">
            Všechny karty →
          </Link>
        </div>
        <div className="pl-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(208px,1fr))] sm:gap-6">
          {fresh.map((c) => (
            <CardTile
              key={c.slug}
              href={`/karta/${c.slug}`}
              name={c.name}
              set={c.set}
              number={c.number}
              condition={c.condition}
              lang={c.lang}
              finish={c.finish}
              priceHal={c.priceHal}
              wasPriceHal={c.wasPriceHal}
              stock={c.stock}
              image={c.image}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="how-h" style={{ background: "var(--surface-200)", borderTop: "3px solid var(--ink)", borderBottom: "3px solid var(--ink)" }}>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="how-h" className="m-0 text-[44px] leading-[44px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              Výkup ve třech krocích
            </h2>
            <Link href="/vykup" className="text-[15px] font-extrabold">
              Začít výkup →
            </Link>
          </div>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 p-0">
            {[
              ["Vyber karty a stav", "Najdeš je podle názvu nebo čísla. Odhad ceny uvidíš hned."],
              ["Pošli je nám", "Zásilkovnou nebo osobně. Odhad platí 7 dní."],
              ["Dostaneš peníze nebo kredit", "Po kontrole karet potvrdíme cenu a pošleme platbu."],
            ].map(([title, text], i) => (
              <li
                key={title}
                className={`pl-lift ${i % 2 ? "pl-lift--right" : ""} flex flex-col gap-2.5 rounded-2xl border-2 p-6`}
                style={{ background: "var(--surface-100)", borderColor: "var(--line)" }}
              >
                <span className="pl-sticker-num pl-wiggle-child">{i + 1}</span>
                <strong className="text-[19px] leading-[26px]">{title}</strong>
                <span className="text-[15px] leading-[22px]" style={{ color: "var(--ink-muted)" }}>
                  {text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="sets-h" className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-14 sm:px-6">
        <h2 id="sets-h" className="m-0 text-[44px] leading-[44px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Procházej podle edice
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {demoSets.map((s) => (
            <Link
              key={s.name}
              href={`/karty?edice=${encodeURIComponent(s.name)}`}
              className="pl-lift pl-lift--yellow flex items-center justify-between gap-3 rounded-[14px] border-2 px-5 py-4 no-underline"
              style={{ background: "var(--surface-100)", borderColor: "var(--line)" }}
            >
              <span className="flex flex-col gap-0.5">
                <strong className="text-base">{s.name}</strong>
                <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {s.series}
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-[1280px] px-4 sm:px-6">
        <div
          className="pl-stripes flex flex-wrap items-center justify-between gap-6 rounded-[20px] border-[3px] px-6 py-10 sm:px-10"
          style={{ color: "#f4eee6", borderColor: "var(--on-yellow)", boxShadow: "6px 6px 0 var(--brand-yellow)" }}
        >
          <div className="flex max-w-[640px] flex-col gap-2">
            <h2 className="m-0 text-[44px] leading-[44px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              Máš doma karty, které nehraješ?
            </h2>
            <p className="m-0 text-base leading-6 opacity-85">Spočítej si odhad výkupu za minutu. Za kredit do e-shopu dostaneš víc.</p>
          </div>
          <Link href="/vykup" className={linkBtn} style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "#f4eee6" }}>
            Spočítat výkup
          </Link>
        </div>
      </section>
    </>
  );
}
