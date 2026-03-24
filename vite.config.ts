import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "renderer/public",
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "renderer/src"),
    },
  },
});
