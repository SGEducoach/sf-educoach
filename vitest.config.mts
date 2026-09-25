import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// tsconfig.json'daki "@/*" → "./src/*" eşlemesi testlerde de geçerli olsun;
// yoksa "@/lib/..." içe aktaran modüller test edilemiyor.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
