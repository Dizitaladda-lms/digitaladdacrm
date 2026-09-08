import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({ path: ".env.test", override: false });

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
