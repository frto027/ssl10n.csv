import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webRoot = fileURLToPath(new URL("./web_root", import.meta.url));

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL("./src/web", import.meta.url)),
  base: "./",
  plugins: [react()],
  // Serve existing snapshots locally without invoking Crowdin.
  publicDir: command === "serve" ? webRoot : false,
  build: {
    outDir: webRoot,
    // The output directory also contains manifest.json and protobuf snapshots.
    emptyOutDir: false,
    copyPublicDir: false,
  },
}));
