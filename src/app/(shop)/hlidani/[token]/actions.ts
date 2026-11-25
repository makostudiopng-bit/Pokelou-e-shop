"use server";
import { revalidatePath } from "next/cache";
import { getDb, hasDb } from "@/db";
import { cancelWatch, confirmWatch } from "@/lib/watches";

// Potvrzení a zrušení jdou přes tlačítko (POST), ne přímo odkazem: e-mailové programy
// a antiviry odkazy z e-mailů samy otevírají a hlídání by se jinak potvrdilo bez zákazníka.
export async function confirmWatchAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (hasDb()) await confirmWatch(await getDb(), token);
  revalidatePath(`/hlidani/${token}`);
}

export async function cancelWatchAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (hasDb()) await cancelWatch(await getDb(), token);
  revalidatePath(`/hlidani/${token}`);
}
