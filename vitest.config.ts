import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@drs/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@drs/dataverse": fileURLToPath(
        new URL("./packages/dataverse/src/index.ts", import.meta.url),
      ),
      "@drs/storage": fileURLToPath(
        new URL("./packages/storage/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    globals: false,
  },
});
