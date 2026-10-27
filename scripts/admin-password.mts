// Vyrobí hodnoty pro přihlášení do administrace:
//   npx tsx scripts/admin-password.mts "silné heslo"
// Výstup vlož do Vercelu (Settings → Environment Variables) a dej Redeploy.
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/admin-auth";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error('Použití: npx tsx scripts/admin-password.mts "heslo aspoň 12 znaků"');
  process.exit(1);
}
console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(pw)}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
