import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/beacons": { target: "http://localhost:3010", secure: false, changeOrigin: true },
      "/auth": { target: "http://localhost:3010", secure: false, changeOrigin: true },
      "/sse": { target: "http://localhost:3010", secure: false, changeOrigin: true },
      "/api": { target: "http://localhost:3010", secure: false, changeOrigin: true },
    },
  },
});
