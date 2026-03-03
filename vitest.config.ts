import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      reporter: ['html'],
      reportsDirectory: './coverage',
      include: ["src/**/*.ts"],
    },
    include: ["test/unit/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@prisma/generated": path.resolve(process.cwd(), "prisma", "generated"),
    },
  },
});
