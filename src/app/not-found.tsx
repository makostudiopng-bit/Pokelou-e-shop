import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="pl-sticker-num" aria-hidden="true">
        ?
      </span>
      <h1 className="m-0 text-[40px] leading-[44px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Tahle stránka utekla
      </h1>
      <p className="m-0 text-[17px] leading-[26px]" style={{ color: "var(--ink-muted)" }}>
        Možná už je karta prodaná, nebo se adresa změnila.
      </p>
      <Link href="/karty" className="pl-btn pl-btn--primary no-underline">
        Prohlédnout karty
      </Link>
    </main>
  );
}
