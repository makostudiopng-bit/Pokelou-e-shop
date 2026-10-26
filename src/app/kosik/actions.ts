"use server";
// Akce košíku. Volat je jde přímým POSTem, proto každá ověřuje vstup a sklad sama.
import { addToCart, setQty } from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-server";
import { getOffers } from "@/lib/catalog";

export type AddState = { status: "idle" | "added" | "max" | "unavailable"; count?: number };

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const int = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number.parseInt(str(v), 10);
  return Number.isFinite(n) ? n : fallback;
};

async function findOffer(id: string) {
  const { offers } = await getOffers();
  return offers.find((o) => o.id === id);
}

export async function addToCartAction(_prev: AddState, form: FormData): Promise<AddState> {
  const offer = await findOffer(str(form.get("kus")));
  if (!offer || offer.stock <= 0) return { status: "unavailable" };
  const res = addToCart(await readCart(), offer.id, int(form.get("pocet"), 1), offer.stock);
  if (res.added === 0) return { status: "max" };
  await writeCart(res.lines);
  return { status: "added", count: res.added };
}

export async function updateQtyAction(form: FormData) {
  const id = str(form.get("kus"));
  const offer = await findOffer(id);
  const lines = await readCart();
  await writeCart(setQty(lines, id, offer ? int(form.get("pocet"), 0) : 0, offer?.stock ?? 0));
}

export async function removeFromCartAction(form: FormData) {
  const id = str(form.get("kus"));
  await writeCart((await readCart()).filter((l) => l.id !== id));
}
