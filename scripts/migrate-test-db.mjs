import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = new URL(process.env.TEST_DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Configure TEST_DATABASE_URL local com nome terminado em _test.");
}
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() },
});
process.exitCode = result.status ?? 1;
