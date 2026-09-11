import "dotenv/config";

const url = new URL(process.env.TEST_DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Testes exigem TEST_DATABASE_URL local com nome terminado em _test.");
}
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();
// Os mocks de integração usam o contrato JSON da API Google Books v1.
process.env.GOOGLE_BOOKS_API_KEY = "integration-test-key";
