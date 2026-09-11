import { defineConfig } from "vitest/config";
import base from "./vitest.config.ts";

export default defineConfig({
  ...base,
  test: { include: ["tests/integration/**/*.test.ts"], setupFiles: ["tests/support/integration-env.ts"], testTimeout: 20000, fileParallelism: false },
});
