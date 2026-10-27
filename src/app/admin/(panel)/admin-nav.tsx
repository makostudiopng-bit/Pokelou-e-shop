"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ orders, buybacks }: { orders: number; buybacks: number }) {
  const path = usePathname();
  const items: [string, string, number?][] = [
    ["/admin", "Přehled"],
    ["/admin/objednavky", "Objednávky", orders],
    ["/admin/vykupy", "Výkupy", buybacks],
    ["/admin/sklad", "Sklad"],
    ["/admin/naskladnit", "Naskladnit"],
    ["/admin/edice", "Edice z TCGdex"],
  ];
  return (
    <ul className="pl-admin-nav m-0 flex list-none flex-row flex-wrap gap-1 p-0 md:flex-col">
      {items.map(([href, label, n]) => {
        const current = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <li key={href}>
            <Link href={href} aria-current={current ? "page" : undefined}>
              {label}
              {n ? <span className="pl-count">{n}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
