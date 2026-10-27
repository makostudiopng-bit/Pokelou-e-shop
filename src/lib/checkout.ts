// Pokladna jako čisté funkce: které kombinace dopravy a platby jdou, kolik to stojí
// a kontrola vyplněného formuláře.
import { z } from "zod";

export { paymentAllowed, totals } from "./checkout-calc";
import { paymentAllowed } from "./checkout-calc";

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, msg: string) => text(max).min(1, msg);

export const checkoutSchema = z
  .object({
    email: z.string().trim().pipe(z.email("Zkontroluj e-mail")),
    phone: text(30).regex(/^\+?[0-9 ]{9,20}$/, "Telefon ve tvaru +420 777 123 456"),
    name: required(120, "Vyplň jméno a příjmení"),
    shipping: z.enum(["zasilkovna", "ceska_posta", "pickup"], "Vyber dopravu"),
    payment: z.enum(["card", "bank_transfer", "cod"], "Vyber platbu"),
    point: text(200).optional(),
    street: text(160).optional(),
    city: text(100).optional(),
    zip: text(10).optional(),
    company: z.boolean().default(false),
    companyId: text(12).optional(),
    note: text(1000).optional(),
    terms: z.literal(true, "Bez souhlasu s obchodními podmínkami objednávku odeslat nejde"),
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

type Raw = ReturnType<typeof formToInput>;

/** Pole, která jsou povinná jen u některé dopravy. Kontroluje se vždy, ať zákazník vidí všechny chyby najednou. */
function conditionalErrors(v: Raw): FieldErrors {
  const e: FieldErrors = {};
  if (v.shipping === "zasilkovna" && !v.point) e.point = "Napiš výdejní místo nebo Z-BOX";
  if (v.shipping === "ceska_posta") {
    if (!v.street) e.street = "Vyplň ulici a číslo";
    if (!v.city) e.city = "Vyplň město";
    if (!/^\d{3} ?\d{2}$/.test(v.zip ?? "")) e.zip = "PSČ ve tvaru 110 00";
  }
  if (v.company && !/^\d{8}$/.test(v.companyId ?? "")) e.companyId = "IČO má 8 číslic";
  return e;
}
export type FieldErrors = Partial<Record<keyof CheckoutInput | "form", string>>;

/** Z FormData na objekt pro checkoutSchema. */
export function formToInput(f: FormData) {
  const s = (k: string) => {
    const v = f.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return {
    email: s("email") ?? "",
    phone: s("phone") ?? "",
    name: s("name") ?? "",
    shipping: s("shipping"),
    payment: s("payment"),
    point: s("point"),
    street: s("street"),
    city: s("city"),
    zip: s("zip"),
    company: f.get("company") === "on",
    companyId: s("companyId")?.replace(/\s/g, ""),
    note: s("note"),
    terms: f.get("terms") === "on",
  };
}

export function validateCheckout(f: FormData, cardEnabled: boolean) {
  const raw = formToInput(f);
  const res = checkoutSchema.safeParse(raw);
  const errors: FieldErrors = {};
  if (!res.success) {
    for (const i of res.error.issues) {
      const k = String(i.path[0] ?? "form") as keyof FieldErrors;
      errors[k] ??= i.message;
    }
  }
  Object.assign(errors, conditionalErrors(raw));
  if (!res.success || Object.keys(errors).length > 0) return { ok: false as const, errors, values: raw };
  if (!paymentAllowed(res.data.payment, res.data.shipping, cardEnabled)) {
    return { ok: false as const, errors: { payment: "Tuhle platbu teď s vybranou dopravou nejde použít" }, values: raw };
  }
  return { ok: true as const, data: res.data };
}

/** Variabilní symbol = číslo objednávky bez pomlček: RRMMDD + 4 číslice. */
export function newOrderNumber(now = new Date(), rnd = Math.random) {
  const p = (n: number) => String(n).padStart(2, "0");
  const day = `${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const tail = String(Math.floor(rnd() * 10000)).padStart(4, "0");
  return { number: `PL-${day}-${tail}`, vs: `${day}${tail}` };
}
