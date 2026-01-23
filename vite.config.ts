import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const manifestIcons = [
  { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
];

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/FIT2.0/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      filename: "manifest.json",
      manifest: {
        name: "SouFIT",
        short_name: "SouFIT",
        description: "Treinos guiados e acompanhamento diário com Firebase",
        theme_color: "#1b5e20",
        background_color: "#ffffff",
        display: "standalone",
        icons: manifestIcons
      }
    })
  ],
  server: {
    open: false
  },
  preview: {
    port: 4173
  }
});
