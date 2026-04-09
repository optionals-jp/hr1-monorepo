import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
    deps: {
      moduleDirectories: ["node_modules", path.resolve(__dirname, "node_modules")],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@hr1/shared-ui": path.resolve(__dirname, "../packages/shared-ui/src"),
    },
    dedupe: ["react", "react-dom"],
  },
});
