import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/rss": {
        target: "https://georezo.net",
        changeOrigin: true,
        rewrite: () => "/extern.php?type=rss&fid=10",
      },
    },
  },
});
