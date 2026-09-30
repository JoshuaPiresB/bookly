import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const password = randomBytes(24).toString("hex");
const secret = randomBytes(48).toString("base64url");
const content = `NODE_ENV=development\nPOSTGRES_USER=bookly\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=bookly\nPOSTGRES_PORT=5432\nDATABASE_URL=postgresql://bookly:${password}@127.0.0.1:5432/bookly?schema=public\nDIRECT_URL=\nAUTH_SECRET=${secret}\nNEXTAUTH_URL=http://localhost:3000\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nGOOGLE_BOOKS_API_KEY=\nRESEND_API_KEY=\nRESEND_FROM=Bookly <nao-responda@seu-dominio.com>\nPASSWORD_RESET_TTL_MINUTES=30\nALLOW_DEV_SEED=false\nSEED_EMAIL=demo@bookly.local\nSEED_PASSWORD=\nTEST_DATABASE_URL=\nPLAYWRIGHT_CHANNEL=\n`;
try {
  await writeFile(".env", content, { flag: "wx", mode: 0o600 });
  console.log(".env criado com segredos aleatórios. Nenhuma credencial foi exibida.");
} catch (error) {
  if (error.code === "EEXIST") {
    console.log("O .env já existe e foi preservado.");
  } else { throw error; }
}
