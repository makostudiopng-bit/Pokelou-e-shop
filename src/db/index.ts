import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL není nastavená");
  return drizzle(neon(url), { schema });
}

let instance: ReturnType<typeof create> | undefined;

/** Připojení k databázi se vytvoří až při prvním použití (build ho nepotřebuje). */
export function getDb() {
  instance ??= create();
  return instance;
}

export { schema };
