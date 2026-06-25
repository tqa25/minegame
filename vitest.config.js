import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.js"],
    alias: {
      "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js": "three",
    },
  },
});
