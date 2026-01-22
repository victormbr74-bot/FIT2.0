import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/FIT2.0/" : "/",
  plugins: [react()],
  server: {
    open: false
  },
  preview: {
    port: 4173
  }
});
